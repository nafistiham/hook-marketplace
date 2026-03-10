# hookpm login / logout / publish (Phase 1B) Design

**Status:** Draft
**Date:** 2026-03-11
**Scope:** `packages/cli/` — `login`, `logout`, and upgraded `publish` commands
**Phase:** Phase 1B
**Depends on:** `docs/design/2026-03-10-api-routes.md`

---

## TL;DR

Adds `hookpm login` (GitHub OAuth via Clerk, browser + polling), `hookpm logout` (token deletion), and upgrades `hookpm publish` from a browser-redirect stub to a real multipart POST to `POST /registry/hooks`. Auth tokens are stored in `~/.hookpm/auth.json` (mode 600). The publish command reads `hook.json` from cwd, builds a `.tar.gz` archive in a temp directory, verifies schema, and sends both files as multipart/form-data with the Clerk JWT.

---

## Table of Contents

1. [Auth Flow (login)](#1-auth-flow-login)
2. [Token Storage](#2-token-storage)
3. [publish Command](#3-publish-command)
4. [Archive Building](#4-archive-building)
5. [Error Handling](#5-error-handling)
6. [Interface Contracts](#6-interface-contracts)
7. [Security Considerations](#7-security-considerations)
8. [Open Questions Resolved](#8-open-questions-resolved)

---

## 1. Auth Flow (login)

**Resolution of OQ#3:** The CLI uses the **browser + polling** pattern (same as GitHub Device Flow spirit, but using Clerk's hosted OAuth). This avoids requiring a running local server (no port conflicts) and works in SSH/remote environments by printing the URL.

```mermaid
flowchart TD
    Start["hookpm login"]
    GenState["Generate random state (32 bytes hex)"]
    OpenBrowser["Open browser to Clerk OAuth URL\n(includes state + redirect_uri=https://hookpm.dev/auth/callback)"]
    PrintURL["Print URL to terminal\n(for SSH/headless environments)"]
    PollStart["Poll GET /auth/token?state=<state>\nevery 2 seconds, up to 5 minutes"]
    PollPending{"200 with token?"}
    PollTimeout["Error: login timed out"]
    SaveToken["Write ~/.hookpm/auth.json (mode 600)"]
    Done["hookpm login successful"]

    Start --> GenState
    GenState --> OpenBrowser
    OpenBrowser --> PrintURL
    PrintURL --> PollStart
    PollStart --> PollPending
    PollPending -->|no, keep polling| PollStart
    PollPending -->|timeout| PollTimeout
    PollPending -->|yes| SaveToken
    SaveToken --> Done
```

**Clerk OAuth redirect:** `https://hookpm.dev/auth/callback` stores the JWT keyed by `state` in a short-lived KV entry (TTL 10 minutes). The polling endpoint reads and deletes the KV entry on first retrieval.

**`hookpm logout`:** Deletes `~/.hookpm/auth.json`. No server call — Clerk JWTs are short-lived (1 hour); logout just removes the local credential.

---

## 2. Token Storage

```
~/.hookpm/auth.json   (mode 600 — owner read/write only)
```

```typescript
type AuthFile = {
  clerk_token: string   // Clerk JWT
  expires_at: string    // ISO 8601 — CLI checks before use, refreshes if within 5 min of expiry
  username: string      // GitHub username — cached to avoid API call on publish
}
```

**Refresh:** If `expires_at` is within 5 minutes of now, `hookpm publish` prompts the user to `hookpm login` again. Automatic token refresh is out of scope for Phase 1B — Clerk short-lived tokens require the OAuth flow.

**Missing token:** If `auth.json` does not exist and the user runs `hookpm publish`, the command prints `Not logged in. Run: hookpm login` and exits 1.

---

## 3. publish Command

```mermaid
flowchart TD
    Start["hookpm publish"]
    ReadAuth["Read ~/.hookpm/auth.json"]
    AuthMissing{"file exists?"}
    AuthErr["Error: not logged in\nhookpm login"]
    TokenExpired{"token expired?"}
    ExpiredErr["Error: token expired\nhookpm login"]
    ReadHookJson["Read ./hook.json"]
    HookMissing{"file exists?"}
    HookErr["Error: hook.json not found in cwd"]
    ValidateSchema["HookJsonSchema.safeParse(hook.json)"]
    SchemaFail{"valid?"}
    SchemaErr["Error: validation failed\n(show zod errors)"]
    BuildArchive["Build .tar.gz in temp dir\n(all files in cwd except node_modules, .git)"]
    ArchiveErr["Error: archive build failed"]
    PostAPI["POST /registry/hooks\nAuthorization: Bearer <token>\nmultipart: manifest + archive"]
    APIResp{"response status"}
    API401["Error: not logged in\nhookpm login"]
    API403["Error: hook.json author\ndoes not match your username"]
    API409["Error: version already exists\nbump version in hook.json"]
    API422["Error: schema rejected by server"]
    API5xx["Error: server error (transient)\nretry or check status.hookpm.dev"]
    Done["Published <name>@<version>"]

    Start --> ReadAuth
    ReadAuth --> AuthMissing
    AuthMissing -->|no| AuthErr
    AuthMissing -->|yes| TokenExpired
    TokenExpired -->|yes| ExpiredErr
    TokenExpired -->|no| ReadHookJson
    ReadHookJson --> HookMissing
    HookMissing -->|no| HookErr
    HookMissing -->|yes| ValidateSchema
    ValidateSchema --> SchemaFail
    SchemaFail -->|no| SchemaErr
    SchemaFail -->|yes| BuildArchive
    BuildArchive -->|error| ArchiveErr
    BuildArchive -->|ok| PostAPI
    PostAPI --> APIResp
    APIResp -->|401| API401
    APIResp -->|403| API403
    APIResp -->|409| API409
    APIResp -->|422| API422
    APIResp -->|5xx| API5xx
    APIResp -->|201| Done
```

**Archive filename:** `<name>-<version>.tar.gz` (e.g. `bash-danger-guard-1.0.0.tar.gz`). Built into a temp dir, cleaned up after upload (success or failure).

**Author field pre-check:** Before building the archive, compare `hook.json.author` against the cached `username` in `auth.json`. If they differ, fail early with a clear error (same check the server will do anyway, but avoids the slow archive build + upload round-trip).

---

## 4. Archive Building

**Files included:** Everything in cwd except:
- `node_modules/`
- `.git/`
- Files matching `.gitignore` (if present) — best-effort, not guaranteed

**Implementation:** Reuse the BSD-tar-compatible staging approach from `registry/scripts/build-archives.ts`:
1. Create temp dir `<os.tmpdir()>/<name>-<version>/`
2. Copy included files into the staging dir
3. Run `tar -czf <tmpdir>/<name>-<version>.tar.gz -C <tmpdir> <name>-<version>`
4. Return the archive path

**Size limit:** Warn if archive > 5 MB (the server rejects > 10 MB, but warn early at 5 MB so authors can investigate before the upload fails).

---

## 5. Error Handling

| Scenario | Exit code | Message |
|----------|-----------|---------|
| `auth.json` missing | 1 | `Not logged in. Run: hookpm login` |
| Token expired | 1 | `Session expired. Run: hookpm login` |
| `hook.json` missing | 1 | `hook.json not found in current directory` |
| Schema invalid | 1 | Zod error summary (≤5 issues) |
| Author mismatch (local) | 1 | `hook.json author '<X>' does not match your username '<Y>'` |
| Archive build fail | 1 | `Failed to build archive: <reason>` |
| API 401 | 1 | `Authentication failed. Run: hookpm login` |
| API 403 | 1 | `Not authorized to publish as '<author>'` |
| API 409 | 1 | `<name>@<version> already published. Bump the version.` |
| API 422 | 1 | `Server rejected hook.json: <message>` |
| API 5xx | 1 | `Server error. Try again or check status.hookpm.dev` |
| Timeout (login polling) | 1 | `Login timed out. Try again.` |

---

## 6. Interface Contracts

```typescript
// ~/.hookpm/auth.json
type AuthFile = {
  clerk_token: string
  expires_at: string  // ISO 8601
  username: string
}

// Polling endpoint response (GET /auth/token?state=<state>)
// 200 when token ready, 204 while pending, 410 on expiry
type TokenPollResponse = {
  token: string       // Clerk JWT
  expires_at: string  // ISO 8601
  username: string    // GitHub username
}

// publish command options
type PublishOptions = {
  dryRun?: boolean  // validate + build archive, skip upload
}

// Internal: result of buildArchive()
type ArchiveResult =
  | { ok: true; archivePath: string; sizeBytes: number }
  | { ok: false; error: Error }
```

**API endpoint reuse:** `POST /registry/hooks` from `docs/design/2026-03-10-api-routes.md` — multipart `manifest` (hook.json) + `archive` (.tar.gz), `Authorization: Bearer <token>`.

---

## 7. Security Considerations

- **CVE-2025-59536:** `apiUrl` sourced exclusively from `config.ts` (Zod-validated, must use `https://`). `hookpm publish` never follows redirects from 201 responses to a different host.
- **CVE-2026-21852:** `auth.json` token is sent only to `config.apiUrl` — never logged, never included in error messages, never sent to the registry URL (separate from API URL).
- **Token file permissions:** `auth.json` written with `fs.writeFileSync(path, data, { mode: 0o600 })`. Parent dir `~/.hookpm/` created with `0o700` if absent.
- **State parameter:** Login flow generates 32 bytes of CSPRNG state to prevent CSRF on the OAuth callback.
- **No token in CLI output:** `hookpm login` never prints the JWT to stdout/stderr. Only the Clerk OAuth URL and success message are shown.

---

## 8. Open Questions Resolved

| OQ | Resolution |
|----|------------|
| OQ#3 (login flow) | Browser + polling pattern. CLI opens browser, polls `/auth/token?state=` every 2 seconds for up to 5 minutes. Falls back to printing URL for SSH environments. |

---

## Revision History

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-11 | Initial design | Resolves OQ#3 from api-routes.md; defines Phase 1B login/publish CLI flow |
