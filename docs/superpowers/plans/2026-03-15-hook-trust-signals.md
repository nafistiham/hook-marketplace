# Hook Trust Signals Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `reviewed` boolean with a 4-signal trust model: security gate with structured rejections, `calls_external_api` flag, author `attestations`, and star ratings — surfaced as a single composite health indicator.

**Architecture:** Schema changes flow outward — schema first, then API (static analysis + new rate endpoint + updated publish route), then CLI rendering. New modules `api/src/static-analysis.ts` and `api/src/trust.ts` are created before modifying the API entry point. All changes are backward-compatible (new fields default to `false`/`[]`/`0`).

**Tech Stack:** Zod (schema), Hono + Cloudflare Workers (API), Vitest (tests), TypeScript strict mode throughout.

**Design doc:** `docs/design/2026-03-15-hook-trust-signals.md`

---

## Chunk 1: Schema Changes

**Files:**
- Modify: `packages/schema/src/schema.ts`
- Modify: `packages/schema/src/__tests__/schema.test.ts`

### Task 1.1: Add `AttestationKey` enum and `attestations` field

- [ ] **Step 1: Write failing tests**

Add to `packages/schema/src/__tests__/schema.test.ts`:

```ts
describe('AttestationKey', () => {
  it('accepts valid attestation keys', () => {
    const schema = z.array(AttestationKey)
    expect(schema.parse(['no-network', 'read-only', 'local-only'])).toEqual(['no-network', 'read-only', 'local-only'])
  })

  it('rejects unknown attestation keys', () => {
    const schema = z.array(AttestationKey)
    expect(() => schema.parse(['unknown-key'])).toThrow()
  })
})

describe('HookJsonSchema attestations', () => {
  it('defaults attestations to empty array', () => {
    const result = HookJsonSchema.parse(MINIMAL_HOOK)
    expect(result.attestations).toEqual([])
  })

  it('accepts valid attestations array', () => {
    const result = HookJsonSchema.parse({ ...MINIMAL_HOOK, attestations: ['no-network', 'read-only'] })
    expect(result.attestations).toEqual(['no-network', 'read-only'])
  })

  it('rejects invalid attestation key', () => {
    expect(() => HookJsonSchema.parse({ ...MINIMAL_HOOK, attestations: ['invalid'] })).toThrow()
  })
})

describe('HookIndexEntrySchema attestations + ratings', () => {
  it('defaults attestations, rating_count, rating_avg', () => {
    const result = HookIndexEntrySchema.parse(MINIMAL_INDEX_ENTRY)
    expect(result.attestations).toEqual([])
    expect(result.rating_count).toBe(0)
    expect(result.rating_avg).toBe(0)
  })

  it('accepts rating_count and rating_avg', () => {
    const result = HookIndexEntrySchema.parse({
      ...MINIMAL_INDEX_ENTRY,
      rating_count: 10,
      rating_avg: 4.2,
    })
    expect(result.rating_count).toBe(10)
    expect(result.rating_avg).toBe(4.2)
  })
})
```

Note: Import `AttestationKey` from schema. `MINIMAL_HOOK` and `MINIMAL_INDEX_ENTRY` are existing fixtures in the test file — add `attestations: []` to `MINIMAL_INDEX_ENTRY` in the fixture if not present.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd packages/schema && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|AttestationKey|attestations|rating'
```

Expected: tests fail with "AttestationKey is not defined"

- [ ] **Step 3: Implement in `packages/schema/src/schema.ts`**

After the `CAPABILITIES` block (line 43), add:

```ts
// ─── Attestations ─────────────────────────────────────────────────────────────

export const ATTESTATION_KEYS = [
  'no-network',
  'read-only',
  'no-env-access',
  'no-subprocess',
  'idempotent',
  'local-only',
] as const

export const AttestationKey = z.enum(ATTESTATION_KEYS)
export type AttestationKeyType = z.infer<typeof AttestationKey>
```

Add to `SecuritySchema` (after `signature`):
```ts
calls_external_api: z.boolean().default(false),
spawns_subprocess: z.boolean().default(false),
```

Add `attestations` to `HookJsonSchema` (after `provenance`):
```ts
attestations: z.array(AttestationKey).default([]),
```

Add to `HookIndexEntrySchema` (after `updated_at`):
```ts
attestations: z.array(AttestationKey).default([]),
rating_count: z.number().int().nonnegative().default(0),
rating_avg: z.number().min(0).max(5).default(0),
```

Export new types at bottom of file:
```ts
export type AttestationKey = z.infer<typeof AttestationKey>
```

Note: `HookJsonRegistrySchema` extends `HookJsonSchema` so it inherits `attestations` automatically. `calls_external_api` and `spawns_subprocess` are in `SecuritySchema` which is already in both registry and index schemas.

- [ ] **Step 4: Run tests — expect pass**

```bash
cd packages/schema && pnpm test
```

Expected: all tests pass. Check typecheck too:
```bash
pnpm typecheck
```

- [ ] **Step 5: Update existing test fixtures in `commands.test.ts` and any other test files that construct `HOOK` or `INDEX_ENTRY` fixtures**

The `HOOK` fixture in `packages/cli/src/commands/__tests__/commands.test.ts` uses `HookJsonRegistry` type. TypeScript strict mode will fail if the new `SecuritySchema` fields are missing from the fixture. Add to the `security` object in `HOOK`:
```ts
calls_external_api: false,
spawns_subprocess: false,
```

Add to `HOOK` top level:
```ts
attestations: [],
```

Add to `INDEX_ENTRY`:
```ts
attestations: [],
rating_count: 0,
rating_avg: 0,
```

Then run all CLI tests to confirm nothing broke:
```bash
cd packages/cli && pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/schema.ts packages/schema/src/__tests__/schema.test.ts packages/cli/src/commands/__tests__/commands.test.ts
git commit -m "schema(schema): add attestations, calls_external_api, spawns_subprocess, ratings fields"
```

---

## Chunk 2: Static Analysis Module

**Files:**
- Create: `api/src/static-analysis.ts`
- Create: `api/src/__tests__/static-analysis.test.ts`

### Task 2.1: Create `api/src/static-analysis.ts`

**Scope note:** The Cloudflare Worker API receives the `hook.json` manifest and a binary `.tar.gz` archive. Extracting and scanning arbitrary files from a tar.gz in Workers is non-trivial. For Phase 1B, static analysis is **manifest-based only**: Stage A checks handler type; Stage B scans the `handler.command` string (for `command` type handlers). Full source file scanning is done by `build-index.ts` which runs in Node.js. This is a documented Phase 1B limitation.

- [ ] **Step 1: Write failing tests in `api/src/__tests__/static-analysis.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { detectCallsExternalApi, detectSpawnsSubprocess } from '../static-analysis.js'
import type { HookJson } from '@hookpm/schema'

const BASE: HookJson = {
  name: 'test-hook',
  version: '1.0.0',
  description: 'test',
  author: 'test',
  license: 'MIT',
  event: 'PreToolUse',
  handler: { type: 'command', command: 'python3 guard.py', async: false },
  capabilities: ['block'],
  tags: [],
  permissions: { network: { allowed: false, domains: [] }, filesystem: { read: [], write: [] }, env_vars: [], spawns_processes: false },
  requires: {},
  attestations: [],
}

describe('detectCallsExternalApi', () => {
  it('returns true for http handler type', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'http', url: 'https://example.com/hook' } }
    expect(detectCallsExternalApi(hook)).toBe(true)
  })

  it('returns false for command handler with no network patterns', () => {
    expect(detectCallsExternalApi(BASE)).toBe(false)
  })

  it('detects fetch( in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: 'node -e "fetch(\'https://x.com\')"', async: false } }
    expect(detectCallsExternalApi(hook)).toBe(true)
  })

  it('detects curl in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: 'curl https://example.com/api', async: false } }
    expect(detectCallsExternalApi(hook)).toBe(true)
  })

  it('detects wget in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: 'wget -q https://x.com', async: false } }
    expect(detectCallsExternalApi(hook)).toBe(true)
  })

  it('detects https.request in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: 'node script.js', async: false } }
    // No pattern match on just 'node script.js'
    expect(detectCallsExternalApi(hook)).toBe(false)
  })

  it('returns false for prompt handler with no network patterns', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'prompt', prompt: 'Summarize changes' } }
    expect(detectCallsExternalApi(hook)).toBe(false)
  })
})

describe('detectSpawnsSubprocess', () => {
  it('returns false for command handler with no subprocess patterns', () => {
    expect(detectSpawnsSubprocess(BASE)).toBe(false)
  })

  it('detects exec( in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: 'node -e "exec(\'ls\')"', async: false } }
    expect(detectSpawnsSubprocess(hook)).toBe(true)
  })

  it('detects spawn( in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: 'node -e "spawn(\'git\', [])"', async: false } }
    expect(detectSpawnsSubprocess(hook)).toBe(true)
  })

  it('returns false for http handler', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'http', url: 'https://x.com' } }
    expect(detectSpawnsSubprocess(hook)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd api && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|detectCalls|detectSpawns'
```

Expected: "Cannot find module '../static-analysis.js'"

- [ ] **Step 3: Implement `api/src/static-analysis.ts`**

```ts
import type { HookJson } from '@hookpm/schema'

// Patterns that suggest external HTTP calls — scanned in command strings
const NETWORK_PATTERNS = [
  'fetch(',
  'axios.',
  'https.request',
  'http.request',
  'curl ',
  'wget ',
  'axios(',
  'got(',
  'superagent',
  'node-fetch',
]

// Patterns that suggest subprocess spawning — scanned in command strings
const SUBPROCESS_PATTERNS = [
  'exec(',
  'execSync(',
  'spawn(',
  'spawnSync(',
  'child_process',
  'subprocess.run',
  'subprocess.Popen',
  'os.system(',
  'os.popen(',
]

function commandString(hook: HookJson): string {
  if (hook.handler.type === 'command') return hook.handler.command
  if (hook.handler.type === 'prompt') return hook.handler.prompt
  if (hook.handler.type === 'agent') return hook.handler.prompt
  return ''
}

/**
 * Detects whether a hook makes external HTTP/API calls.
 * Stage A: http handler type → unconditionally true.
 * Stage B: scan command/prompt string for known network patterns.
 * Phase 1B limitation: does not scan archive source files.
 */
export function detectCallsExternalApi(hook: HookJson): boolean {
  // Stage A: http handler type is by definition an external call
  if (hook.handler.type === 'http') return true

  // Stage B: scan the command/prompt string
  const cmd = commandString(hook)
  return NETWORK_PATTERNS.some((p) => cmd.includes(p))
}

/**
 * Detects whether a hook spawns subprocesses beyond the handler itself.
 * Scans command/prompt string for known subprocess patterns.
 * Phase 1B limitation: does not scan archive source files.
 */
export function detectSpawnsSubprocess(hook: HookJson): boolean {
  const cmd = commandString(hook)
  return SUBPROCESS_PATTERNS.some((p) => cmd.includes(p))
}

/**
 * Run all static analysis detections and return platform-determined flags.
 */
export function runStaticAnalysis(hook: HookJson): {
  calls_external_api: boolean
  spawns_subprocess: boolean
} {
  return {
    calls_external_api: detectCallsExternalApi(hook),
    spawns_subprocess: detectSpawnsSubprocess(hook),
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd api && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|detectCalls|detectSpawns|static-analysis'
```

- [ ] **Step 5: Run typecheck**

```bash
cd api && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add api/src/static-analysis.ts api/src/__tests__/static-analysis.test.ts
git commit -m "feat(api): add static analysis module for calls_external_api and spawns_subprocess detection"
```

---

## Chunk 3: Trust Module

**Files:**
- Create: `api/src/trust.ts`
- Create: `api/src/__tests__/trust.test.ts`

### Task 3.1: Create `api/src/trust.ts`

- [ ] **Step 1: Write failing tests in `api/src/__tests__/trust.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { computeHealthTier, TRUST_THRESHOLDS } from '../trust.js'
import type { HookIndexEntry } from '@hookpm/schema'

const BASE_ENTRY: HookIndexEntry = {
  name: 'test',
  description: 'test',
  author: 'test',
  event: 'PreToolUse',
  tags: [],
  capabilities: ['block'],
  security: {
    sandbox_level: 'static-analysis',
    reviewed: false,
    review_date: null,
    signed: false,
    signed_by: null,
    signature: null,
    calls_external_api: false,
    spawns_subprocess: false,
  },
  attestations: [],
  rating_count: 0,
  rating_avg: 0,
  latest: '1.0.0',
  versions: ['1.0.0'],
  updated_at: '2026-03-15T00:00:00Z',
}

describe('TRUST_THRESHOLDS', () => {
  it('exposes required constants', () => {
    expect(TRUST_THRESHOLDS.MIN_RATINGS_FOR_SCORE).toBe(5)
    expect(TRUST_THRESHOLDS.MIN_AVG_FOR_TRUSTED).toBe(4.0)
    expect(TRUST_THRESHOLDS.MIN_ATTESTATIONS_FOR_TRUSTED).toBe(1)
  })
})

describe('computeHealthTier', () => {
  it('returns unverified when sandbox_level is none', () => {
    const entry: HookIndexEntry = { ...BASE_ENTRY, security: { ...BASE_ENTRY.security, sandbox_level: 'none' } }
    expect(computeHealthTier(entry)).toBe('unverified')
  })

  it('returns passing for hook that passed security gate with no other signals', () => {
    expect(computeHealthTier(BASE_ENTRY)).toBe('passing')
  })

  it('returns safe when calls_external_api is false', () => {
    // calls_external_api: false already — this is SAFE because no external API calls
    expect(computeHealthTier(BASE_ENTRY)).toBe('passing') // no attestations yet so not SAFE tier... actually wait
    // BASE_ENTRY has calls_external_api: false so it IS safe — let's verify the logic
    // SAFE = PASSING + (calls_external_api: false OR 'no-network' attested)
    // BASE_ENTRY has calls_external_api: false → should be 'safe'
  })

  it('returns safe when calls_external_api false (no attestations needed for safe tier)', () => {
    const entry = { ...BASE_ENTRY }
    expect(computeHealthTier(entry)).toBe('safe')
  })

  it('returns passing when calls_external_api is true and no no-network attestation', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      security: { ...BASE_ENTRY.security, calls_external_api: true },
      attestations: [],
    }
    expect(computeHealthTier(entry)).toBe('passing')
  })

  it('returns safe when calls_external_api true but no-network attested', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      security: { ...BASE_ENTRY.security, calls_external_api: true },
      attestations: ['no-network'],
    }
    expect(computeHealthTier(entry)).toBe('safe')
  })

  it('returns trusted when safe + attestations + sufficient high ratings', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      attestations: ['no-network'],
      rating_count: 5,
      rating_avg: 4.0,
    }
    expect(computeHealthTier(entry)).toBe('trusted')
  })

  it('returns safe when ratings below threshold', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      attestations: ['no-network'],
      rating_count: 4,
      rating_avg: 5.0,
    }
    expect(computeHealthTier(entry)).toBe('safe')
  })

  it('returns safe when avg below MIN_AVG_FOR_TRUSTED', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      attestations: ['no-network'],
      rating_count: 10,
      rating_avg: 3.9,
    }
    expect(computeHealthTier(entry)).toBe('safe')
  })
})
```

Note: Clean up the duplicate/contradictory test case above — keep the version that matches the actual logic. The correct interpretation: `SAFE = PASSING + (calls_external_api: false OR 'no-network' attested)`. So `BASE_ENTRY` with `calls_external_api: false` is `'safe'`.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd api && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|trust|computeHealth'
```

- [ ] **Step 3: Implement `api/src/trust.ts`**

```ts
import type { HookIndexEntry } from '@hookpm/schema'

export type HealthTier = 'trusted' | 'safe' | 'passing' | 'unverified'

export const TRUST_THRESHOLDS = {
  MIN_RATINGS_FOR_SCORE: 5,
  MIN_AVG_FOR_TRUSTED: 4.0,
  MIN_ATTESTATIONS_FOR_TRUSTED: 1,
} as const

export function computeHealthTier(entry: HookIndexEntry): HealthTier {
  const passing = entry.security.sandbox_level !== 'none'
  if (!passing) return 'unverified'

  const safe =
    !entry.security.calls_external_api ||
    entry.attestations.includes('no-network')

  if (!safe) return 'passing'

  const trusted =
    entry.attestations.length >= TRUST_THRESHOLDS.MIN_ATTESTATIONS_FOR_TRUSTED &&
    entry.rating_count >= TRUST_THRESHOLDS.MIN_RATINGS_FOR_SCORE &&
    entry.rating_avg >= TRUST_THRESHOLDS.MIN_AVG_FOR_TRUSTED

  return trusted ? 'trusted' : 'safe'
}

/** Format health tier for CLI display */
export function formatHealthTier(tier: HealthTier): string {
  switch (tier) {
    case 'trusted':   return '✓ trusted'
    case 'safe':      return '✓ safe'
    case 'passing':   return '· passing'
    case 'unverified': return '⚠ unverified'
  }
}
```

- [ ] **Step 4: Fix test — remove contradictory test case, run all**

The test file above has a contradictory duplicate — remove the first `safe` test and keep the one that correctly expects `'safe'`:
```ts
// REMOVE this one:
it('returns safe when calls_external_api is false', () => { ... toBe('passing') })
// KEEP only:
it('returns safe when calls_external_api false (no attestations needed for safe tier)', () => { ... toBe('safe') })
```

```bash
cd api && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add api/src/trust.ts api/src/__tests__/trust.test.ts
git commit -m "feat(api): add trust module with TRUST_THRESHOLDS and computeHealthTier"
```

---

## Chunk 4: API — Modified Publish Route

**Files:**
- Modify: `api/src/index.ts`
- Modify: `api/src/__tests__/publish.test.ts` (or the existing test that covers publish)

Find the existing publish tests first:
```bash
grep -r 'POST.*registry/hooks' api/src --include='*.test.ts' -l
```

### Task 4.1: Add static analysis and attestation consistency to `POST /registry/hooks`

- [ ] **Step 1: Write failing tests**

Add to the existing publish test file (or create `api/src/__tests__/publish-trust.test.ts`):

```ts
describe('POST /registry/hooks — static analysis and attestation consistency', () => {
  it('sets calls_external_api: true for http handler type', async () => {
    const hook = { ...VALID_HOOK, handler: { type: 'http', url: 'https://example.com/hook' } }
    const res = await app.request('/registry/hooks', {
      method: 'POST',
      headers: { 'X-Admin-Token': 'test-admin', 'Content-Type': 'multipart/form-data; boundary=X' },
      body: makeFormData(hook),
      ...testEnv,
    })
    expect(res.status).toBe(201)
    // Read back stored manifest from mock R2 to verify calls_external_api was set
    const stored = testEnv.HOOKPM_BUCKET._get('hooks/test-hook/hook.json')
    expect(JSON.parse(stored).security.calls_external_api).toBe(true)
  })

  it('rejects no-network attestation when http handler present — returns 400 ATTESTATION_CONFLICT', async () => {
    const hook = {
      ...VALID_HOOK,
      handler: { type: 'http', url: 'https://example.com/hook' },
      attestations: ['no-network'],
    }
    const res = await app.request('/registry/hooks', {
      method: 'POST',
      ...makeMultipartRequest(hook),
      ...testEnv,
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { ok: boolean; error: string }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('ATTESTATION_CONFLICT')
  })

  it('preserves attestations in stored manifest on success', async () => {
    const hook = { ...VALID_HOOK, attestations: ['read-only', 'idempotent'] }
    const res = await app.request('/registry/hooks', {
      method: 'POST',
      ...makeMultipartRequest(hook),
      ...testEnv,
    })
    expect(res.status).toBe(201)
    const stored = testEnv.HOOKPM_BUCKET._get('hooks/valid-hook/hook.json')
    expect(JSON.parse(stored).attestations).toEqual(['read-only', 'idempotent'])
  })

  it('stores sandbox_level as static-analysis after publish', async () => {
    const res = await app.request('/registry/hooks', {
      method: 'POST',
      ...makeMultipartRequest(VALID_HOOK),
      ...testEnv,
    })
    expect(res.status).toBe(201)
    const stored = testEnv.HOOKPM_BUCKET._get('hooks/valid-hook/hook.json')
    expect(JSON.parse(stored).security.sandbox_level).toBe('static-analysis')
  })
})
```

Note: Look at existing publish tests to understand how `testEnv`, `makeMultipartRequest`, and mock R2 are set up — mirror that pattern exactly. The tests mock the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers` or similar. Check how existing API tests work before writing these.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd api && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|attestation|static-analysis|publish-trust'
```

- [ ] **Step 3: Modify `POST /registry/hooks` in `api/src/index.ts`**

Add import at top:
```ts
import { runStaticAnalysis } from './static-analysis.js'
```

In `POST /registry/hooks`, after step 3 (schema validation) and before step 4 (author check):

```ts
// 3b. Static analysis — determine platform flags
const { calls_external_api, spawns_subprocess } = runStaticAnalysis(parsed.data)

// 3c. Attestation consistency check
const conflicts: Array<{ attestation: string; reason: string }> = []
if (parsed.data.attestations.includes('no-network') && calls_external_api) {
  conflicts.push({
    attestation: 'no-network',
    reason: `hook handler type is '${parsed.data.handler.type}' or command contains network patterns`,
  })
}
if (parsed.data.attestations.includes('no-subprocess') && spawns_subprocess) {
  conflicts.push({
    attestation: 'no-subprocess',
    reason: 'command contains subprocess spawn patterns',
  })
}
if (conflicts.length > 0) {
  return Response.json({ ok: false, error: 'ATTESTATION_CONFLICT', conflicts }, { status: 400 })
}
```

Replace the `hook` construction (the block that force-resets `reviewed`):
```ts
const hook = {
  ...parsed.data,
  security: {
    ...parsed.data.security,
    reviewed: false,
    review_date: null,
    sandbox_level: 'static-analysis' as const,
    calls_external_api,
    spawns_subprocess,
  },
}
```

Update `newEntry` construction to include new fields:
```ts
const newEntry: HookIndexEntry = {
  // ... existing fields ...
  attestations: hook.attestations,
  rating_count: priorHooks.find((h) => h.name === hook.name)?.rating_count ?? 0,
  rating_avg: priorHooks.find((h) => h.name === hook.name)?.rating_avg ?? 0,
  // ... rest ...
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd api && pnpm test
```

- [ ] **Step 5: Typecheck**

```bash
cd api && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add api/src/index.ts api/src/__tests__/publish-trust.test.ts
git commit -m "feat(api): add static analysis gate and attestation consistency check to publish route"
```

---

## Chunk 5: API — Rate Endpoint

**Files:**
- Modify: `api/src/index.ts` (add new route)
- Create: `api/src/__tests__/rate.test.ts`

### Task 5.1: Implement `POST /registry/hooks/:name/rate`

- [ ] **Step 1: Write failing tests in `api/src/__tests__/rate.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

// Mirror existing API test setup pattern for testEnv and app

describe('POST /registry/hooks/:name/rate', () => {
  it('requires Clerk JWT — returns 401 when no auth header', async () => {
    const res = await app.request('/registry/hooks/bash-danger-guard/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 4 }),
      ...{ env: { ...testEnv, __TEST_CLERK_USER: undefined } },
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 for invalid score (out of range)', async () => {
    const res = await app.request('/registry/hooks/bash-danger-guard/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 6 }),
      ...testEnvWithUser,
    })
    expect(res.status).toBe(422)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_SCORE')
  })

  it('returns 404 when hook does not exist', async () => {
    const res = await app.request('/registry/hooks/nonexistent-hook/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 4 }),
      ...testEnvWithUser,
    })
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('HOOK_NOT_FOUND')
  })

  it('returns 200 with rating stats on success (Supabase unconfigured → graceful)', async () => {
    // With no SUPABASE_URL configured, rating is accepted but not stored
    const res = await app.request('/registry/hooks/bash-danger-guard/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 4 }),
      ...testEnvWithHookAndUser,
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; rating_avg: number; rating_count: number }
    expect(body.ok).toBe(true)
    expect(typeof body.rating_avg).toBe('number')
    expect(typeof body.rating_count).toBe('number')
  })

  it('returns 429 when rate limit exceeded', async () => {
    // Set KV counter to >= 10
    const res = await app.request('/registry/hooks/bash-danger-guard/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 4 }),
      ...testEnvWithRateLimitExceeded,
    })
    expect(res.status).toBe(429)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('RATE_LIMITED')
  })
})
```

Note: Check how existing API tests set up the test environment (especially `__TEST_CLERK_USER` and mock R2 with pre-populated `index.json`). The `testEnvWithHookAndUser` should have a pre-populated R2 index with `bash-danger-guard` in it and a test Clerk user injected.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd api && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|rate'
```

Expected: all tests fail with 404 (route doesn't exist yet)

- [ ] **Step 3: Implement the rate endpoint in `api/src/index.ts`**

Add after the report endpoint, before the rankings endpoint:

```ts
// ─── Rate a hook ──────────────────────────────────────────────────────────────

const RATING_RATE_LIMIT = 10
const RATING_KV_TTL = 3600

app.post('/registry/hooks/:name/rate', async (c) => {
  // 1. Resolve user (Clerk JWT required)
  const userOrErr = await resolveUser(c.req.raw, c.env)
  if (userOrErr instanceof Response) return userOrErr
  const user = userOrErr

  // 2. Validate score before consuming rate limit budget
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Request body must be valid JSON')
  }
  const { score } = body as { score?: unknown }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
    return errorResponse(422, 'INVALID_SCORE', 'score must be an integer between 1 and 5')
  }

  // 3. KV rate limit by user id (GET → increment → PUT pattern; racy but acceptable for Phase 1B)
  if (c.env.AUTH_KV) {
    const kvKey = `rate:${user.id}:ratings`
    const current = await c.env.AUTH_KV.get(kvKey)
    const count = current ? parseInt(current, 10) : 0
    if (count >= RATING_RATE_LIMIT) {
      return errorResponse(429, 'RATE_LIMITED', 'Too many rating requests — try again later')
    }
    await c.env.AUTH_KV.put(kvKey, String(count + 1), { expirationTtl: RATING_KV_TTL })
  }

  const name = c.req.param('name')

  // 4. Check hook exists in R2 index
  const indexObj = await c.env.HOOKPM_BUCKET.get('index.json')
  if (!indexObj) return errorResponse(404, 'HOOK_NOT_FOUND', `Hook "${name}" not found`)

  let priorHooks: HookIndexEntry[]
  try {
    const raw = JSON.parse(await indexObj.text()) as unknown
    const p = HookIndexSchema.safeParse(raw)
    priorHooks = p.success ? p.data.hooks : []
  } catch {
    priorHooks = []
  }

  const hookEntry = priorHooks.find((h) => h.name === name)
  if (!hookEntry) return errorResponse(404, 'HOOK_NOT_FOUND', `Hook "${name}" not found`)

  // 5. Upsert rating into Supabase; compute new avg from DB aggregate
  let rating_avg = hookEntry.rating_avg
  let rating_count = hookEntry.rating_count

  if (c.env.SUPABASE_URL && c.env.SUPABASE_SERVICE_KEY) {
    // Upsert rating
    const upsertRes = await fetch(`${c.env.SUPABASE_URL}/rest/v1/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ hook_name: name, user_id: user.id, score }]),
    })
    if (!upsertRes.ok) {
      return errorResponse(502, 'SUPABASE_ERROR', 'Failed to record rating')
    }

    // Compute aggregate fresh from DB
    const aggRes = await fetch(
      `${c.env.SUPABASE_URL}/rest/v1/ratings?hook_name=eq.${encodeURIComponent(name)}&select=score`,
      {
        headers: {
          apikey: c.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
        },
      },
    )
    if (aggRes.ok) {
      const rows = (await aggRes.json()) as Array<{ score: number }>
      rating_count = rows.length
      rating_avg = rating_count > 0
        ? rows.reduce((sum, r) => sum + r.score, 0) / rating_count
        : 0
    }

    // 6. Update index.json in R2 with new rating stats
    const updatedHooks = priorHooks.map((h) =>
      h.name === name ? { ...h, rating_avg, rating_count } : h
    )
    const updatedIndex = {
      schema_version: '1' as const,
      generated_at: new Date().toISOString(),
      hooks: updatedHooks,
    }
    try {
      await c.env.HOOKPM_BUCKET.put('index.json', JSON.stringify(updatedIndex), {
        httpMetadata: { contentType: 'application/json' },
      })
    } catch {
      // R2 update failure is non-fatal — Supabase is authoritative
    }
  }

  return c.json({ ok: true, rating_avg, rating_count })
})
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd api && pnpm test
```

- [ ] **Step 5: Typecheck**

```bash
cd api && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add api/src/index.ts api/src/__tests__/rate.test.ts
git commit -m "feat(api): add POST /registry/hooks/:name/rate endpoint with KV rate limiting"
```

---

## Chunk 6: CLI Rendering

**Files:**
- Modify: `packages/cli/src/commands/output.ts`
- Modify: `packages/cli/src/commands/search.ts`
- Modify: `packages/cli/src/commands/install.ts`
- Modify: `packages/cli/src/commands/__tests__/commands.test.ts`

### Task 6.1: Update `hookDetail()` in `output.ts`

- [ ] **Step 1: Write failing tests — add to `commands.test.ts` under `runInfo()`**

```ts
describe('runInfo() — new trust signals', () => {
  it('shows calls_external_api warning when true', async () => {
    const hookWithApi = {
      ...HOOK,
      security: { ...HOOK.security, calls_external_api: true, spawns_subprocess: false },
    }
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: hookWithApi })
    const { allOutput } = captureOutput()
    await runInfo('bash-danger-guard')
    expect(allOutput()).toMatch(/external api/i)
  })

  it('shows attestations with author-declared label when present', async () => {
    const hookWithAttest = { ...HOOK, attestations: ['no-network', 'read-only'] }
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: hookWithAttest })
    const { allOutput } = captureOutput()
    await runInfo('bash-danger-guard')
    expect(allOutput()).toContain('no-network')
    expect(allOutput()).toMatch(/author-declared/i)
  })

  it('does not show attestations section when attestations empty', async () => {
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    const { allOutput } = captureOutput()
    await runInfo('bash-danger-guard')
    expect(allOutput()).not.toMatch(/author-declared/i)
  })
})
```

- [ ] **Step 2: Run — expect failures**

```bash
cd packages/cli && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|external api|author-declared'
```

- [ ] **Step 3: Update `hookDetail()` in `output.ts`**

After the existing `line('reviewed', reviewedLabel)` block, add:

```ts
  // API cost signal
  if (hook.security.calls_external_api) {
    line('api calls', '⚠ makes external API calls (may incur cost or latency)')
  } else {
    line('api calls', '· no external API calls')
  }

  // Subprocess signal
  if (hook.security.spawns_subprocess) {
    line('subprocesses', '⚠ spawns subprocesses')
  }

  // Author attestations
  if (hook.attestations && hook.attestations.length > 0) {
    line('attestations', `${hook.attestations.join(', ')} (author-declared)`)
  }
```

Note: `hookDetail` accepts `HookJsonRegistry` which now has `attestations` and the new security fields from the updated schema. TypeScript will enforce these are present.

- [ ] **Step 4: Run — expect pass**

```bash
cd packages/cli && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|runInfo'
```

### Task 6.2: Update `runSearch()` — health + rating columns

- [ ] **Step 1: Write failing tests — add to `commands.test.ts` under `runSearch()`**

```ts
describe('runSearch() — health and rating columns', () => {
  it('shows health column instead of status', async () => {
    vi.mocked(fetchIndex).mockResolvedValue({ ok: true, data: VALID_INDEX })
    const { allOutput } = captureOutput()
    await runSearch()
    expect(allOutput()).toContain('health')
    expect(allOutput()).not.toContain('status')
  })

  it('shows rating column with count when below threshold', async () => {
    const indexWithRating: HookIndex = {
      ...VALID_INDEX,
      hooks: [{ ...INDEX_ENTRY, rating_count: 3, rating_avg: 4.5 }],
    }
    vi.mocked(fetchIndex).mockResolvedValue({ ok: true, data: indexWithRating })
    const { allOutput } = captureOutput()
    await runSearch()
    expect(allOutput()).toContain('(3)')
    // Should NOT show stars when below threshold
    expect(allOutput()).not.toContain('★')
  })

  it('shows star rating when at or above threshold', async () => {
    const indexWithRating: HookIndex = {
      ...VALID_INDEX,
      hooks: [{ ...INDEX_ENTRY, rating_count: 5, rating_avg: 4.2 }],
    }
    vi.mocked(fetchIndex).mockResolvedValue({ ok: true, data: indexWithRating })
    const { allOutput } = captureOutput()
    await runSearch()
    expect(allOutput()).toContain('★')
    expect(allOutput()).toContain('4.2')
  })
})
```

- [ ] **Step 2: Run — expect failures**

```bash
cd packages/cli && pnpm test -- --reporter=verbose 2>&1 | grep -E 'FAIL|PASS|health column|rating column'
```

- [ ] **Step 3: Update `runSearch()` in `search.ts`**

Replace the row construction and table call:

```ts
import { computeHealthTier, formatHealthTier, TRUST_THRESHOLDS } from '../trust.js'

// ... in runSearch():

const rows = hooks.map((h) => {
  const tier = computeHealthTier(h)
  const health = formatHealthTier(tier)

  const rating =
    h.rating_count >= TRUST_THRESHOLDS.MIN_RATINGS_FOR_SCORE
      ? `★ ${h.rating_avg.toFixed(1)} (${h.rating_count})`
      : `(${h.rating_count})`

  return {
    name: h.name,
    description: h.description,
    event: h.event,
    health,
    rating,
  }
})

table(rows, { columns: ['name', 'description', 'event', 'health', 'rating'] })
```

Note: `computeHealthTier` and `formatHealthTier` are in `api/src/trust.ts`. For the CLI, either:
- Copy the logic inline to `packages/cli/src/trust.ts` (preferred — no cross-package dependency)
- Or publish `@hookpm/trust` as a shared package (overkill for Phase 1B)

**Create `packages/cli/src/trust.ts`** (copy of the pure logic, no Cloudflare Workers dependencies):

```ts
import type { HookIndexEntry } from '@hookpm/schema'

export type HealthTier = 'trusted' | 'safe' | 'passing' | 'unverified'

export const TRUST_THRESHOLDS = {
  MIN_RATINGS_FOR_SCORE: 5,
  MIN_AVG_FOR_TRUSTED: 4.0,
  MIN_ATTESTATIONS_FOR_TRUSTED: 1,
} as const

export function computeHealthTier(entry: HookIndexEntry): HealthTier {
  const passing = entry.security.sandbox_level !== 'none'
  if (!passing) return 'unverified'

  const safe =
    !entry.security.calls_external_api ||
    entry.attestations.includes('no-network')

  if (!safe) return 'passing'

  const trusted =
    entry.attestations.length >= TRUST_THRESHOLDS.MIN_ATTESTATIONS_FOR_TRUSTED &&
    entry.rating_count >= TRUST_THRESHOLDS.MIN_RATINGS_FOR_SCORE &&
    entry.rating_avg >= TRUST_THRESHOLDS.MIN_AVG_FOR_TRUSTED

  return trusted ? 'trusted' : 'safe'
}

export function formatHealthTier(tier: HealthTier): string {
  switch (tier) {
    case 'trusted':    return '✓ trusted'
    case 'safe':       return '✓ safe'
    case 'passing':    return '· passing'
    case 'unverified': return '⚠ unverified'
  }
}
```

Import from `'../trust.js'` in `search.ts`.

- [ ] **Step 4: Run — expect pass**

```bash
cd packages/cli && pnpm test
```

### Task 6.3: Update `runInstall()` — `calls_external_api` warning

- [ ] **Step 1: Write failing test — add to `commands.test.ts` under `runInstall()`**

```ts
it('prints external API warning when hook calls external APIs', async () => {
  const hookWithApi = {
    ...HOOK,
    security: { ...HOOK.security, calls_external_api: true },
  }
  vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: hookWithApi })
  vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
  vi.mocked(downloadArchive).mockResolvedValue({
    ok: true,
    installedPath: '/tmp/hookpm/hooks/bash-danger-guard@1.0.0',
    integrity: 'sha256-abc123',
  })
  vi.mocked(mergeHookIntoSettings).mockResolvedValue({
    added: true, settingsIndex: 0, event: 'PreToolUse',
  })
  const { allErrors } = captureOutput()
  await runInstall('bash-danger-guard', {})
  expect(allErrors()).toMatch(/external api/i)
})
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Update `install.ts`**

After the `!hook.security?.reviewed` warning block and before the capability check, add:

```ts
  // Warn if hook makes external API calls
  if (hook.security?.calls_external_api) {
    process.stderr.write(`⚠ "${name}" makes external API calls — this may incur cost or latency.\n`)
  }
```

- [ ] **Step 4: Run all CLI tests — expect pass**

```bash
cd packages/cli && pnpm test
```

- [ ] **Step 5: Typecheck**

```bash
cd packages/cli && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/output.ts packages/cli/src/commands/search.ts packages/cli/src/commands/install.ts packages/cli/src/trust.ts packages/cli/src/commands/__tests__/commands.test.ts
git commit -m "feat(cli): render attestations, calls_external_api, health tier, and ratings in CLI commands"
```

---

## Chunk 7: Registry Build-Index Update

**Files:**
- Modify: `registry/scripts/build-index.ts`

Note: `build-index.ts` runs in Node.js (not Cloudflare Workers), so it can read actual source files from disk. It should run full source file scanning rather than manifest-only scanning.

### Task 7.1: Update `build-index.ts` to include new fields and run full source file scan

- [ ] **Step 1: Create `registry/scripts/static-analysis-node.ts`** — Node.js file scanner

```ts
import * as fs from 'node:fs'
import * as path from 'node:path'

const NETWORK_PATTERNS = [
  'fetch(', 'axios.', 'https.request', 'http.request', 'curl ', 'wget ',
  'axios(', 'got(', 'superagent', 'node-fetch',
]

const SUBPROCESS_PATTERNS = [
  'exec(', 'execSync(', 'spawn(', 'spawnSync(', 'child_process',
  'subprocess.run', 'subprocess.Popen', 'os.system(', 'os.popen(',
]

const SKIP_EXTENSIONS = new Set(['.json', '.md', '.lock', '.png', '.jpg', '.svg'])

function readSourceFiles(hookDir: string): string[] {
  try {
    return fs.readdirSync(hookDir)
      .filter((f) => !SKIP_EXTENSIONS.has(path.extname(f)))
      .map((f) => {
        try { return fs.readFileSync(path.join(hookDir, f), 'utf8') } catch { return '' }
      })
  } catch {
    return []
  }
}

export function scanHookDir(hookDir: string): {
  calls_external_api: boolean
  spawns_subprocess: boolean
} {
  const sources = readSourceFiles(hookDir)
  const combined = sources.join('\n')
  return {
    calls_external_api: NETWORK_PATTERNS.some((p) => combined.includes(p)),
    spawns_subprocess: SUBPROCESS_PATTERNS.some((p) => combined.includes(p)),
  }
}
```

- [ ] **Step 2: Update `build-index.ts` to use full file scan and include new fields**

Add import:
```ts
import { scanHookDir } from './static-analysis-node.js'
import { AttestationKey } from '../../packages/schema/src/schema.js'
```

In the entry construction loop, after `const manifest = result.data`, add:
```ts
  const hookDir = path.join(hooksDir, hookName)
  const { calls_external_api, spawns_subprocess } = scanHookDir(hookDir)
```

Update `security` construction:
```ts
  const security = SecuritySchema.parse({
    ...(manifest.security ?? {}),
    calls_external_api,
    spawns_subprocess,
  })
```

Update `entry` construction to include new fields:
```ts
  const entry: HookIndexEntry = {
    // ... existing fields ...
    attestations: manifest.attestations ?? [],
    rating_count: 0,   // ratings come from Supabase, not from files
    rating_avg: 0,
    // ... rest ...
  }
```

- [ ] **Step 3: Run build-index to verify it works**

```bash
cd /path/to/hook-marketplace && pnpm run build-index
```

Expected: `✓ Built index.json — N hook(s)` with no errors

- [ ] **Step 4: Run validate-all**

```bash
pnpm run validate-all
```

Expected: all hooks pass validation

- [ ] **Step 5: Run full test suite**

```bash
pnpm test --recursive
```

Expected: all tests green

- [ ] **Step 6: Commit**

```bash
git add registry/scripts/build-index.ts registry/scripts/static-analysis-node.ts registry/index.json
git commit -m "feat(registry): update build-index to include attestations, calls_external_api, spawns_subprocess, rating fields"
```

---

## Final Verification

- [ ] Run full workspace typecheck:
```bash
pnpm typecheck --recursive
```

- [ ] Run full workspace lint:
```bash
pnpm lint --recursive
```

- [ ] Run full test suite:
```bash
pnpm test --recursive
```

Expected: all green, no regressions.

- [ ] Confirm index.json is valid:
```bash
pnpm run validate-all
```
