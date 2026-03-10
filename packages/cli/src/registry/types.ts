export type RegistryErrorCode =
  | 'NETWORK_ERROR'      // fetch threw, DNS failure, timeout
  | 'NOT_FOUND'          // 404 from registry, name not in index
  | 'INVALID_RESPONSE'   // response body is not valid JSON
  | 'VALIDATION_ERROR'   // JSON is valid but fails HookJsonRegistrySchema
  | 'INTEGRITY_ERROR'    // archive SHA-256 does not match expected (Phase 1B)
  | 'EXTRACT_ERROR'      // tar extraction failed

export class RegistryError extends Error {
  constructor(
    message: string,
    public readonly code: RegistryErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'RegistryError'
  }
}
