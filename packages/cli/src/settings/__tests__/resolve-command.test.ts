import { describe, it, expect } from 'vitest'
import { resolveCommandPath } from '../merge.js'

describe('resolveCommandPath — Form 2 (simple two-token)', () => {
  it('resolves interpreter + relative script', () => {
    const result = resolveCommandPath('python3 script.py', '/hooks/foo@1.0')
    expect(result).toBe('python3 /hooks/foo@1.0/script.py')
  })

  it('resolves single-token script (./script.sh)', () => {
    const result = resolveCommandPath('./script.sh', '/hooks/foo@1.0')
    expect(result).toBe('/hooks/foo@1.0/script.sh')
  })

  it('resolves node + dist path', () => {
    const result = resolveCommandPath('node dist/index.js', '/hooks/foo@1.0')
    expect(result).toBe('node /hooks/foo@1.0/dist/index.js')
  })

  it('quotes script path when installedPath contains spaces', () => {
    const result = resolveCommandPath('python3 script.py', '/Users/jane doe/.hookpm/hooks/foo@1.0')
    expect(result).toBe('python3 "/Users/jane doe/.hookpm/hooks/foo@1.0/script.py"')
  })

  it('quotes single-token script when installedPath contains spaces', () => {
    const result = resolveCommandPath('./script.sh', '/Users/jane doe/.hookpm/hooks/foo@1.0')
    expect(result).toBe('"/Users/jane doe/.hookpm/hooks/foo@1.0/script.sh"')
  })
})

describe('resolveCommandPath — Form 1 ($HOOK_DIR)', () => {
  it('replaces $HOOK_DIR placeholder in simple form', () => {
    const result = resolveCommandPath('python3 -u $HOOK_DIR/script.py', '/hooks/foo@1.0')
    expect(result).toBe('python3 -u /hooks/foo@1.0/script.py')
  })

  it('replaces multiple $HOOK_DIR occurrences', () => {
    const result = resolveCommandPath(
      'node $HOOK_DIR/dist/index.js --config $HOOK_DIR/config.json',
      '/hooks/foo@1.0',
    )
    expect(result).toBe('node /hooks/foo@1.0/dist/index.js --config /hooks/foo@1.0/config.json')
  })

  it('quotes the whole resolved token when installedPath has spaces (not just installedPath)', () => {
    const result = resolveCommandPath(
      'python3 -u $HOOK_DIR/script.py',
      '/Users/jane doe/foo',
    )
    // Token "$HOOK_DIR/script.py" resolves to "/Users/jane doe/foo/script.py" — whole token quoted
    expect(result).toBe('python3 -u "/Users/jane doe/foo/script.py"')
  })

  it('handles single-token $HOOK_DIR command (the command IS the hook dir entry point)', () => {
    const result = resolveCommandPath('$HOOK_DIR/run.sh', '/hooks/foo@1.0')
    expect(result).toBe('/hooks/foo@1.0/run.sh')
  })

  it('handles non-$HOOK_DIR tokens alongside $HOOK_DIR tokens unchanged', () => {
    const result = resolveCommandPath(
      'python3 -u $HOOK_DIR/script.py --verbose',
      '/hooks/foo@1.0',
    )
    expect(result).toBe('python3 -u /hooks/foo@1.0/script.py --verbose')
  })
})
