# Incident Response — hookpm Registry

## Purpose

This document describes the procedure for removing a hook from the hookpm registry when a security incident, policy violation, or critical bug is reported. It is intended for registry maintainers with admin access.

---

## When to Remove a Hook

Remove a hook immediately if it:

- Contains malware, credential exfiltration, or destructive behaviour
- Exploits CVE-2025-59536 (shared-repo injection) or CVE-2026-21852 (API token exfiltration)
- Was submitted fraudulently (author impersonation, name squatting)
- Violates the registry submission policy in a way that cannot be patched

For bugs that can be fixed by the author, prefer the report-then-patch flow:
1. Contact the author privately
2. Give 48 hours to publish a patched version
3. If no response, proceed with removal

---

## How to Remove a Hook

### Step 1 — Confirm the issue

```bash
# Inspect the hook manifest
curl https://api.hookpm.dev/registry/hooks/<name>/hook.json | jq .
```

### Step 2 — Remove via admin API

```bash
curl -X DELETE https://api.hookpm.dev/registry/hooks/<name> \
  -H "X-Admin-Token: $HOOKPM_ADMIN_TOKEN"
```

Expected response:
```json
{ "deleted": true, "name": "<name>" }
```

The endpoint:
- Deletes all R2 objects under `hooks/<name>/` (manifest + all versioned archives)
- Removes the hook from `index.json`
- Returns 403 if the admin token is missing or wrong
- Returns 404 if the hook is not in the registry

### Step 3 — Verify removal

```bash
# Should return 404
curl https://api.hookpm.dev/registry/hooks/<name>/hook.json

# index.json should not list the hook
curl https://api.hookpm.dev/registry/index.json | jq '.hooks[].name'
```

### Step 4 — Notify

- Open a GitHub issue in this repository titled: `[security] Hook <name> removed — <brief reason>`
- Tag it `security` and `incident`
- Include: what was found, when it was removed, whether the author was notified

---

## Admin Token

The admin token is stored as a Cloudflare Workers secret:

```bash
# Set or rotate the token
wrangler secret put ADMIN_TOKEN --env production
```

The token is never committed to source control. If you suspect it has been leaked, rotate it immediately with the command above.

---

## Rollback

If a hook was removed by mistake:

1. Re-publish the hook using `hookpm publish` with the original author credentials, or via the admin publish path
2. Close the incident issue with a note explaining the false positive

---

## Static Analysis CVE Patterns

The publish pipeline runs static analysis on every hook submission. The following patterns trigger automatic rejection:

| Pattern | CVE | Description |
|---------|-----|-------------|
| `subprocess.run(['git', 'remote'...])` + `requests.post` | CVE-2025-59536 | Shared-repo injection — reads git config and exfiltrates to external URL |
| `os.environ.get('ANTHROPIC_API_KEY')` + network call | CVE-2026-21852 | API token exfiltration via environment variable access |

If you find a hook that passed static analysis but exhibits these patterns, remove it immediately and file an issue to improve the static analysis rules.
