import { describe, it, expect, beforeEach } from 'vitest'
import * as alaSqlService from '../alaSqlService'

beforeEach(() => {
  alaSqlService.reset()
})

describe('initDatabase', () => {
  it('initializes database tables gracefully', async () => {
    await alaSqlService.initDatabase()
    expect(alaSqlService.isInitialized()).toBe(true)
  })
})

describe('query', () => {
  it('auto initializes database if query called', async () => {
    const result = await alaSqlService.query('SELECT 1 as num')
    expect(result).toEqual([{ num: 1 }])
  })
})

describe('reset', () => {
  it('resets database state', async () => {
    await alaSqlService.initDatabase()
    expect(alaSqlService.isInitialized()).toBe(true)

    alaSqlService.reset()
    expect(alaSqlService.isInitialized()).toBe(false)
  })
})
