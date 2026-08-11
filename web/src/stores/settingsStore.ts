import { create } from 'zustand'

export interface Settings {
  googleClientId: string
  aiMode: 'system' | 'custom'
  customGcpProjectId: string
  customGcpLocation: string
  googleSheetsUrl?: string
  driveFolderName?: string
  gcpProjectId?: string
  gcpLocation?: string
}

interface SettingsState {
  settings: Settings
  setSettings: (s: Partial<Settings>) => void
  loadSettings: () => void
}

const DEFAULT_GOOGLE_CLIENT_ID =
  '931072805115-92s5rot2jqavlrcoukpk1tqt8o2bslv1.apps.googleusercontent.com'

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    googleClientId: DEFAULT_GOOGLE_CLIENT_ID,
    aiMode: 'system',
    customGcpProjectId: '',
    customGcpLocation: 'us-central1',
    googleSheetsUrl: '',
    gcpProjectId: '',
    gcpLocation: 'us-central1',
    driveFolderName: '夢貘 Videos',
  },
  setSettings: (partial) =>
    set((s) => {
      const next = { ...s.settings, ...partial }
      if (partial.customGcpProjectId !== undefined && partial.gcpProjectId === undefined) {
        next.gcpProjectId = partial.customGcpProjectId
      }
      if (partial.gcpLocation !== undefined && partial.customGcpLocation === undefined) {
        next.customGcpLocation = partial.gcpLocation
      }
      if (partial.gcpProjectId !== undefined && partial.customGcpProjectId === undefined) {
        next.customGcpProjectId = partial.gcpProjectId
      }

      if (next.googleSheetsUrl !== undefined) localStorage.setItem('dreamer_sheet_url', next.googleSheetsUrl)
      if (next.googleClientId !== undefined) localStorage.setItem('dreamer_oauth_client_id', next.googleClientId)
      if (next.aiMode !== undefined) localStorage.setItem('dreamer_ai_mode', next.aiMode)

      const targetGcpProject = next.customGcpProjectId || next.gcpProjectId || ''
      const targetGcpLocation = next.customGcpLocation || next.gcpLocation || 'us-central1'

      localStorage.setItem('dreamer_custom_gcp_project_id', targetGcpProject)
      localStorage.setItem('dreamer_gcp_project_id', targetGcpProject)
      localStorage.setItem('dreamer_custom_gcp_location', targetGcpLocation)
      localStorage.setItem('dreamer_gcp_location', targetGcpLocation)

      if (next.driveFolderName !== undefined) localStorage.setItem('dreamer_drive_folder_name', next.driveFolderName)

      return { settings: next }
    }),
  loadSettings: () =>
    set({
      settings: {
        googleSheetsUrl: localStorage.getItem('dreamer_sheet_url') || '',
        googleClientId: localStorage.getItem('dreamer_oauth_client_id') || DEFAULT_GOOGLE_CLIENT_ID,
        aiMode: (localStorage.getItem('dreamer_ai_mode') as 'system' | 'custom') || 'system',
        customGcpProjectId: localStorage.getItem('dreamer_custom_gcp_project_id') || localStorage.getItem('dreamer_gcp_project_id') || '',
        customGcpLocation: localStorage.getItem('dreamer_custom_gcp_location') || localStorage.getItem('dreamer_gcp_location') || 'us-central1',
        gcpProjectId: localStorage.getItem('dreamer_custom_gcp_project_id') || localStorage.getItem('dreamer_gcp_project_id') || '',
        gcpLocation: localStorage.getItem('dreamer_custom_gcp_location') || localStorage.getItem('dreamer_gcp_location') || 'us-central1',
        driveFolderName: localStorage.getItem('dreamer_drive_folder_name') || '夢貘 Videos',
      },
    }),
}))
