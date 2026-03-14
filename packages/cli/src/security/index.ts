// Full implementation in security TDD step (Phase 1B for signatures)
// See docs/design/2026-03-10-scaffold.md §4.2

export type CapabilityCheckResult =
  | { dangerous: false }
  | { dangerous: true; capabilities: string[] }

// Phase 1A: checks for dangerous capability flags
// Phase 1B: will also verify Ed25519 signature
// Dangerous capabilities: those that can modify agent inputs, inject context, or approve tool use
const DANGEROUS_CAPABILITIES = new Set(['modify-input', 'inject-context', 'approve'])

export function checkCapabilities(capabilities: string[]): CapabilityCheckResult {
  const found = capabilities.filter((c) => DANGEROUS_CAPABILITIES.has(c))
  if (found.length === 0) return { dangerous: false }
  return { dangerous: true, capabilities: found }
}

export type VerifySignatureResult =
  | { ok: true; reason: 'not-signed' | 'verified' }
  | { ok: false; reason: string }

// Phase 1A stub — no Ed25519 signatures in GitHub registry yet
export async function verifySignature(
  _hookName: string,
  _installedPath: string,
): Promise<VerifySignatureResult> {
  return { ok: true, reason: 'not-signed' }
}
