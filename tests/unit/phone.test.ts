import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidKgPhone, maskPhone } from '../../src/lib/phone'

describe('normalizePhone', () => {
  it('normalizes +996XXXXXXXXX', () => {
    expect(normalizePhone('+996700123456')).toBe('+996700123456')
  })

  it('normalizes 0700123456 (local KG format)', () => {
    expect(normalizePhone('0700123456')).toBe('+996700123456')
  })

  it('normalizes 700123456 (9 digits)', () => {
    expect(normalizePhone('700123456')).toBe('+996700123456')
  })

  it('normalizes 996700123456 (without plus)', () => {
    expect(normalizePhone('996700123456')).toBe('+996700123456')
  })

  it('returns null for invalid short number', () => {
    expect(normalizePhone('123')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(normalizePhone('')).toBeNull()
  })
})

describe('isValidKgPhone', () => {
  it('accepts valid KG phone', () => {
    expect(isValidKgPhone('+996700123456')).toBe(true)
    expect(isValidKgPhone('+996555123456')).toBe(true)
    expect(isValidKgPhone('+996770123456')).toBe(true)
  })

  it('rejects non-KG phone', () => {
    expect(isValidKgPhone('+79001234567')).toBe(false)
    expect(isValidKgPhone('+12025550100')).toBe(false)
  })

  it('rejects malformed', () => {
    expect(isValidKgPhone('996700')).toBe(false)
    expect(isValidKgPhone('+996')).toBe(false)
  })
})

describe('maskPhone', () => {
  it('masks middle digits', () => {
    expect(maskPhone('+996700123456')).toBe('+996***456')
  })

  it('handles short strings', () => {
    expect(maskPhone('123')).toBe('***')
  })
})
