import { describe, it, expect } from 'vitest'
import { rateLimit } from '../../src/lib/rate-limit'

describe('rateLimit', () => {
  it('allows requests within limit', () => {
    const key = `test-${Date.now()}`
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, 5, 60_000)
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks requests over limit', () => {
    const key = `test-block-${Date.now()}`
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000)
    const result = rateLimit(key, 5, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('different keys are independent', () => {
    const key1 = `k1-${Date.now()}`
    const key2 = `k2-${Date.now()}`
    for (let i = 0; i < 5; i++) rateLimit(key1, 5, 60_000)
    const result = rateLimit(key2, 5, 60_000)
    expect(result.allowed).toBe(true)
  })
})
