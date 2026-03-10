import { describe, it, expect } from 'vitest'
import { RegistryError } from '../types.js'
import type { RegistryErrorCode } from '../types.js'

describe('RegistryError', () => {
  it('is an instance of Error', () => {
    const err = new RegistryError('network failed', 'NETWORK_ERROR')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(RegistryError)
  })

  it('sets name to RegistryError', () => {
    const err = new RegistryError('network failed', 'NETWORK_ERROR')
    expect(err.name).toBe('RegistryError')
  })

  it('stores the message', () => {
    const err = new RegistryError('hook not found', 'NOT_FOUND')
    expect(err.message).toBe('hook not found')
  })

  it('stores the error code', () => {
    const codes: RegistryErrorCode[] = [
      'NETWORK_ERROR',
      'NOT_FOUND',
      'INVALID_RESPONSE',
      'VALIDATION_ERROR',
      'INTEGRITY_ERROR',
      'EXTRACT_ERROR',
    ]
    for (const code of codes) {
      const err = new RegistryError('msg', code)
      expect(err.code).toBe(code)
    }
  })

  it('stores optional cause when provided', () => {
    const originalError = new Error('timeout')
    const err = new RegistryError('network failed', 'NETWORK_ERROR', originalError)
    expect(err.cause).toBe(originalError)
  })

  it('cause is undefined when not provided', () => {
    const err = new RegistryError('not found', 'NOT_FOUND')
    expect(err.cause).toBeUndefined()
  })

  it('can be caught as an Error in a try/catch', () => {
    expect(() => {
      throw new RegistryError('bad response', 'INVALID_RESPONSE')
    }).toThrow(Error)
  })

  it('can be narrowed by name check', () => {
    const err: unknown = new RegistryError('validation failed', 'VALIDATION_ERROR')
    if (err instanceof RegistryError) {
      expect(err.code).toBe('VALIDATION_ERROR')
    } else {
      throw new Error('should have been RegistryError')
    }
  })
})
