import { describe, it, expect } from 'vitest'
import { config } from '../config'

describe('Server Configuration', () => {
  it('has default fallback values', () => {
    expect(config.port).toBe(3000)
    expect(config.driveFolderName).toBe('DreamerMedia')
    expect(config.systemGcpProjectId).toBe('dreamer-448202')
    expect(config.systemGcpLocation).toBe('us-central1')
    expect(typeof config.spreadsheetId).toBe('string')
  })
})
