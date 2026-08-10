import { describe, it, expect } from 'vitest'
import { buildConfirmationMessage, buildRescheduleMessage, buildRejectionMessage } from '../../src/lib/messages'

describe('buildConfirmationMessage', () => {
  it('includes date and time', () => {
    const dt = new Date('2026-07-28T09:00:00Z') // 15:00 Bishkek
    const msg = buildConfirmationMessage(dt)
    expect(msg).toContain('подтверждена')
    expect(msg).toContain('28.07.2026')
    expect(msg).toContain('Токомбаева')
  })
})

describe('buildRescheduleMessage', () => {
  it('includes suggested time', () => {
    const dt = new Date('2026-07-29T08:30:00Z') // 14:30 Bishkek
    const msg = buildRescheduleMessage(dt)
    expect(msg).toContain('недоступна')
    expect(msg).toContain('29.07.2026')
    expect(msg).toContain('Подходит ли вам')
  })
})

describe('buildRejectionMessage', () => {
  it('returns polite rejection text', () => {
    const msg = buildRejectionMessage()
    expect(msg).toContain('не можем подтвердить')
    expect(msg).toContain('администратор')
  })
})
