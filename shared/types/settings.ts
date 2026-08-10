export interface AppSettings {
  googleClientId: string
  aiMode: 'system' | 'custom'
  customGcpProjectId: string
  customGcpLocation: string
  googleSheetsUrl?: string
  gcpProjectId?: string
  gcpLocation?: string
  driveFolderName?: string
}

