import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../settingsStore'

describe('settingsStore dual mode', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({
      settings: {
        googleClientId: '',
        aiMode: 'system',
        customGcpProjectId: '',
        customGcpLocation: 'us-central1',
        googleSheetsUrl: '',
        driveFolderName: '',
        gcpProjectId: '',
        gcpLocation: 'us-central1',
      },
    })
  })

  it('defaults aiMode to system and custom GCP parameters to empty/default', () => {
    useSettingsStore.getState().loadSettings()
    const { settings } = useSettingsStore.getState()
    expect(settings.aiMode).toBe('system')
    expect(settings.customGcpProjectId).toBe('')
    expect(settings.customGcpLocation).toBe('us-central1')
  })

  it('persists dual mode settings to localStorage and updates state', () => {
    useSettingsStore.getState().setSettings({
      aiMode: 'custom',
      customGcpProjectId: 'my-gcp-project-123',
      customGcpLocation: 'asia-east1',
    })

    expect(localStorage.getItem('dreamer_ai_mode')).toBe('custom')
    expect(localStorage.getItem('dreamer_custom_gcp_project_id')).toBe('my-gcp-project-123')
    expect(localStorage.getItem('dreamer_custom_gcp_location')).toBe('asia-east1')

    const { settings } = useSettingsStore.getState()
    expect(settings.aiMode).toBe('custom')
    expect(settings.customGcpProjectId).toBe('my-gcp-project-123')
    expect(settings.customGcpLocation).toBe('asia-east1')
  })

  it('loads persisted dual mode settings from localStorage', () => {
    localStorage.setItem('dreamer_ai_mode', 'custom')
    localStorage.setItem('dreamer_custom_gcp_project_id', 'persisted-project')
    localStorage.setItem('dreamer_custom_gcp_location', 'europe-west1')

    useSettingsStore.getState().loadSettings()
    const { settings } = useSettingsStore.getState()
    expect(settings.aiMode).toBe('custom')
    expect(settings.customGcpProjectId).toBe('persisted-project')
    expect(settings.customGcpLocation).toBe('europe-west1')
  })
})
