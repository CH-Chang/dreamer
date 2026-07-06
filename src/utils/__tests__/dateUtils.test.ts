import { describe, it, expect } from 'vitest'
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDate,
  getMonthName,
} from '../dateUtils'

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31)
  })

  it('returns 28 for February in non-leap year', () => {
    expect(getDaysInMonth(2025, 1)).toBe(28)
  })

  it('returns 29 for February in leap year', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29)
  })

  it('returns 30 for April', () => {
    expect(getDaysInMonth(2026, 3)).toBe(30)
  })
})

describe('getFirstDayOfMonth', () => {
  it('returns 3 (Wednesday) for 2026-07-01', () => {
    expect(getFirstDayOfMonth(2026, 6)).toBe(3)
  })

  it('returns 0 (Sunday) for 2026-11-01', () => {
    expect(getFirstDayOfMonth(2026, 10)).toBe(0)
  })
})

describe('formatDate', () => {
  it('formats single-digit month and day', () => {
    expect(formatDate(2026, 0, 5)).toBe('2026-01-05')
  })

  it('formats double-digit month and day', () => {
    expect(formatDate(2026, 11, 25)).toBe('2026-12-25')
  })
})

describe('getMonthName', () => {
  it('returns Chinese month name', () => {
    const name = getMonthName(2026, 0)
    expect(name).toContain('2026')
    expect(name).toContain('1月')
  })
})
