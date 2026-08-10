import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt, hashSecret } from '../../src/lib/encryption'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-only'
})

describe('encrypt/decrypt', () => {
  it('round-trips plaintext', () => {
    const plain = 'my-secret-api-key-12345'
    const encrypted = encrypt(plain)
    expect(encrypted).not.toBe(plain)
    expect(encrypted).toContain(':')
    expect(decrypt(encrypted)).toBe(plain)
  })

  it('produces different ciphertext each time (random IV)', () => {
    const plain = 'same-value'
    expect(encrypt(plain)).not.toBe(encrypt(plain))
  })

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test')
    const tampered = encrypted.replace(/.$/, 'X')
    expect(() => decrypt(tampered)).toThrow()
  })
})

describe('hashSecret', () => {
  it('returns consistent hash', () => {
    const h1 = hashSecret('my-secret')
    const h2 = hashSecret('my-secret')
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64) // sha256 hex
  })

  it('different secrets produce different hashes', () => {
    expect(hashSecret('secret-a')).not.toBe(hashSecret('secret-b'))
  })
})
