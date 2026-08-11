import fs from 'fs'
import path from 'path'

try {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    process.loadEnvFile(envPath)
  } else {
    const parentEnvPath = path.resolve(process.cwd(), 'server/.env')
    if (fs.existsSync(parentEnvPath)) {
      process.loadEnvFile(parentEnvPath)
    }
  }
} catch {
  // Ignore env file load errors
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
  driveFolderName: process.env.DRIVE_FOLDER_NAME || 'DreamerMedia',
  systemGcpProjectId: process.env.SYSTEM_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID || 'dreamer-501605',
  systemGcpLocation: process.env.SYSTEM_GCP_LOCATION || process.env.GCP_LOCATION || 'us-central1',
}
