function getSpreadsheetId(): string {
  const envId = process.env.SPREADSHEET_ID
  if (envId) return envId
  return 'dummy_spreadsheet_id'
}

function getToken(): string {
  const token = process.env.GOOGLE_ACCESS_TOKEN || ''
  return token
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const sheetId = getSpreadsheetId()
  const token = getToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(url, {
    ...init,
    headers,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sheets API error: ${body}`)
  }
  return res
}

export async function getSpreadsheetInfo(): Promise<{
  sheets: { properties: { title: string; sheetId: number } }[]
}> {
  const res = await apiFetch('?fields=sheets.properties')
  return (await res.json()) as { sheets: { properties: { title: string; sheetId: number } }[] }
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
  const data = (await res.json()) as { values?: string[][] }
  return data.values || []
}

export async function appendSheetRow(
  sheetName: string,
  values: string[][],
): Promise<void> {
  const sheetId = getSpreadsheetId()
  const token = getToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, {
    method: 'POST',
    headers,
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
  const sheetId = getSpreadsheetId()
  const token = getToken()
  const endCol = columnToLetter(values.length)
  const range = `${encodeURIComponent(sheetName)}!A${rowIndex}:${endCol}${rowIndex}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, {
    method: 'PUT',
    headers,
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
    users: ['email', 'name', 'avatar_url', 'role', 'created_at'],
    categories: ['id', 'name', 'color', 'icon', 'email', 'sort_order', 'created_at'],
    dreams: [
      'id', 'email', 'date', 'description',
      'title', 'tags', 'visibility', 'title_candidates', 'created_at', 'updated_at',
    ],
    edit_logs: ['id', 'dream_id', 'edited_at', 'changes', 'created_at'],
    videos: [
      'id', 'dream_id', 'email', 'status', 'video_url', 'with_character', 'created_at', 'updated_at',
    ],
    comics: [
      'id', 'dream_id', 'email', 'status', 'image_url', 'with_character', 'created_at', 'updated_at',
    ],
    rate_limits: [
      'id', 'type', 'scope', 'daily_limit', 'monthly_limit', 'created_at', 'updated_at',
    ],
    comments: ['id', 'dream_id', 'target_type', 'target_id', 'email', 'content', 'parent_id', 'mentions', 'created_at', 'updated_at'],
  }
  return schema[name] || []
}
