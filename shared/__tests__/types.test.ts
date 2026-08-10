import { describe, it, expect } from 'vitest'
import type { User } from '../types/user'
import type { UsageLog } from '../types/usageLog'

describe('Shared Types', () => {
  it('instantiates User with ai_mode fields', () => {
    const user: User = {
      email: 'test@example.com',
      name: 'Test',
      avatar_url: '',
      role: 'user',
      ai_mode: 'custom',
      custom_gcp_project_id: 'my-project',
      created_at: '2026-08-10T00:00:00Z',
    }
    expect(user.ai_mode).toBe('custom')
  })

  it('instantiates UsageLog correctly', () => {
    const log: UsageLog = {
      id: 'log-1',
      user_email: 'test@example.com',
      action_type: 'video',
      mode: 'system',
      gcp_project_id: 'dreamer-448202',
      quota_deducted: true,
      created_at: '2026-08-10T00:00:00Z',
    }
    expect(log.quota_deducted).toBe(true)
  })
})
