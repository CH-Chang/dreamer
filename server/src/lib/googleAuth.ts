import { GoogleAuth } from 'google-auth-library'

const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/cloud-platform',
  ],
})

export async function getServerAccessToken(): Promise<string> {
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN
  }
  try {
    const client = await auth.getClient()
    const tokenRes = await client.getAccessToken()
    return tokenRes.token || ''
  } catch (err: any) {
    console.warn('Google Server Auth failed (ADC credentials expired or invalid):', err?.message || err)
    return ''
  }
}
