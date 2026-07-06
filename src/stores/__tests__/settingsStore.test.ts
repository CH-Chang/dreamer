import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({
      settings: { googleSheetsUrl: '', googleClientId: '', gcpProjectId: '', gcpLocation: 'us-central1' },
    })
  })

  it('loads empty settings when nothing in localStorage', () => {
    useSettingsStore.getState().loadSettings()
    const state = useSettingsStore.getState()
    expect(state.settings.googleSheetsUrl).toBe('')
    expect(state.settings.googleClientId).toBe('')
    expect(state.settings.gcpProjectId).toBe('')
    expect(state.settings.gcpLocation).toBe('us-central1')
  })

  it('persists settings to localStorage and updates state', () => {
    useSettingsStore.getState().setSettings({
      googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/abc123',
      googleClientId: 'client-id-789',
      gcpProjectId: 'my-project',
      gcpLocation: 'europe-west1',
    })

    expect(localStorage.getItem('dreamer_sheet_url')).toBe(
      'https://docs.google.com/spreadsheets/d/abc123',
    )
    expect(localStorage.getItem('dreamer_oauth_client_id')).toBe('client-id-789')
    expect(localStorage.getItem('dreamer_gcp_project_id')).toBe('my-project')
    expect(localStorage.getItem('dreamer_gcp_location')).toBe('europe-west1')

    const state = useSettingsStore.getState()
    expect(state.settings.googleSheetsUrl).toBe(
      'https://docs.google.com/spreadsheets/d/abc123',
    )
    expect(state.settings.googleClientId).toBe('client-id-789')
    expect(state.settings.gcpProjectId).toBe('my-project')
    expect(state.settings.gcpLocation).toBe('europe-west1')
  })

  it('partial update preserves other fields', () => {
    useSettingsStore.getState().setSettings({ googleSheetsUrl: 'new-url' })
    const state = useSettingsStore.getState()
    expect(state.settings.googleSheetsUrl).toBe('new-url')
    expect(state.settings.googleClientId).toBe('')
    expect(state.settings.gcpProjectId).toBe('')
    expect(state.settings.gcpLocation).toBe('us-central1')
  })

  it('loads persisted settings from localStorage', () => {
    localStorage.setItem('dreamer_sheet_url', 'https://example.com/sheet')
    localStorage.setItem('dreamer_oauth_client_id', 'loaded-client')
    localStorage.setItem('dreamer_gcp_project_id', 'loaded-project')
    localStorage.setItem('dreamer_gcp_location', 'europe-west2')

    useSettingsStore.getState().loadSettings()
    const state = useSettingsStore.getState()
    expect(state.settings.googleSheetsUrl).toBe('https://example.com/sheet')
    expect(state.settings.googleClientId).toBe('loaded-client')
    expect(state.settings.gcpProjectId).toBe('loaded-project')
    expect(state.settings.gcpLocation).toBe('europe-west2')
  })
})
