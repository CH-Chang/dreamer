export const config = {
  port: Number(process.env.PORT) || 3000,
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
  driveFolderName: process.env.DRIVE_FOLDER_NAME || 'DreamerMedia',
  systemGcpProjectId: process.env.SYSTEM_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID || 'dreamer-448202',
  systemGcpLocation: process.env.SYSTEM_GCP_LOCATION || process.env.GCP_LOCATION || 'us-central1',
}
