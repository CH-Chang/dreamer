import { describe, it, expect } from 'vitest'
import { generateId } from '../idGenerator'

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })

  it('returns a UUID-like string', () => {
    const id = generateId()
    expect(id).toMatch(/^[0-9a-f-]+$/)
  })
})
