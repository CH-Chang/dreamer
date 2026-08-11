import { describe, it, expect } from 'vitest'
import { config } from '../config'

describe('Server Configuration', () => {
  it('has default or loaded env values', () => {
    expect(config.port).toBe(3000)
    expect(typeof config.driveFolderName).toBe('string')
    expect(config.driveFolderName.length).toBeGreaterThan(0)
    expect(typeof config.systemGcpProjectId).toBe('string')
    expect(typeof config.systemGcpLocation).toBe('string')
    expect(typeof config.spreadsheetId).toBe('string')
  })
})
