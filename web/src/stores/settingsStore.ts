import { create } from 'zustand'
import type { AppSettings } from '../types/settings'

interface SettingsState {
  settings: AppSettings
  setSettings: (s: Partial<AppSettings>) => void
  loadSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { googleSheetsUrl: '', googleClientId: '', gcpProjectId: '', gcpLocation: 'us-central1', driveFolderName: '夢貘 Videos' },
  setSettings: (partial) => set((s) => {
    const next = { ...s.settings, ...partial }
    localStorage.setItem('dreamer_sheet_url', next.googleSheetsUrl)
    localStorage.setItem('dreamer_oauth_client_id', next.googleClientId)
    localStorage.setItem('dreamer_gcp_project_id', next.gcpProjectId)
    localStorage.setItem('dreamer_gcp_location', next.gcpLocation)
    localStorage.setItem('dreamer_drive_folder_name', next.driveFolderName)
    return { settings: next }
  }),
  loadSettings: () => set({
    settings: {
      googleSheetsUrl: localStorage.getItem('dreamer_sheet_url') || '',
      googleClientId: localStorage.getItem('dreamer_oauth_client_id') || '',
      gcpProjectId: localStorage.getItem('dreamer_gcp_project_id') || '',
      gcpLocation: localStorage.getItem('dreamer_gcp_location') || 'us-central1',
      driveFolderName: localStorage.getItem('dreamer_drive_folder_name') || '夢貘 Videos',
    },
  }),
}))
