import { useAuthStore } from '../stores/authStore'

function getSheetUrl(): string {
  return localStorage.getItem('dreamer_sheet_url') || ''
}

function extractSheetId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) throw new Error('Invalid Google Sheets URL')
  return match[1]
}

function getToken(): string {
  const token = useAuthStore.getState().token
  if (!token) throw new Error('Not authenticated')
  return token
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const sheetId = extractSheetId(getSheetUrl())
  const token = getToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sheets API error: ${body}`)
  }
  return res
}

export async function getSpreadsheetInfo(): Promise<{
  sheets: { properties: { title: string } }[]
}> {
  const res = await apiFetch('?fields=sheets.properties.title')
  return res.json()
}

export async function createSheet(title: string): Promise<void> {
  await apiFetch(':batchUpdate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }],
    }),
  })
}

export async function fetchSheetAsRows(sheetName: string): Promise<string[][]> {
  const res = await apiFetch(`/values/${encodeURIComponent(sheetName)}`)
  const data: { values?: string[][] } = await res.json()
  return data.values || []
}

export async function appendSheetRow(
  sheetName: string,
  values: string[][],
): Promise<void> {
  const sheetId = extractSheetId(getSheetUrl())
  const token = getToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to append row: ${body}`)
  }
}

function columnToLetter(n: number): string {
  let letter = ''
  while (n > 0) {
    n--
    letter = String.fromCharCode(65 + (n % 26)) + letter
    n = Math.floor(n / 26)
  }
  return letter
}

export async function updateSheetRow(
  sheetName: string,
  rowIndex: number,
  values: string[],
): Promise<void> {
  const sheetId = extractSheetId(getSheetUrl())
  const token = getToken()
  const endCol = columnToLetter(values.length)
  const range = `${encodeURIComponent(sheetName)}!A${rowIndex}:${endCol}${rowIndex}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ values: [values] }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to update row: ${body}`)
  }
}

export async function ensureSheetsExist(
  sheetNames: string[],
): Promise<void> {
  const info = await getSpreadsheetInfo()
  const existing = new Set(
    info.sheets.map((s) => s.properties.title),
  )
  for (const name of sheetNames) {
    if (!existing.has(name)) {
      await createSheet(name)
      await appendSheetRow(name, [getHeadersForSheet(name)])
    }
  }
}

export function parseRowsToObjects(rows: string[][]): Record<string, unknown>[] {
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).map((row) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      obj[h.trim()] = row[i]?.trim() || ''
    })
    return obj
  })
}

function getHeadersForSheet(name: string): string[] {
  const schema: Record<string, string[]> = {
    users: ['email', 'name', 'avatar_url', 'created_at'],
    categories: ['id', 'name', 'color', 'icon', 'email', 'sort_order', 'created_at'],
    dreams: [
      'id', 'email', 'date', 'description',
      'title', 'tags', 'edit_log', 'created_at', 'updated_at',
    ],
    videos: [
      'id', 'dream_id', 'email', 'status', 'video_url', 'created_at', 'updated_at',
    ],
  }
  return schema[name] || []
}
