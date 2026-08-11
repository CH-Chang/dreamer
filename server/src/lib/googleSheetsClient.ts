import { config } from '../config'

function getSpreadsheetId(): string {
  return config.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || process.env.SPREADSHEET_ID || 'dummy_spreadsheet_id'
}

function getToken(): string {
  const token = process.env.GOOGLE_ACCESS_TOKEN || ''
  return token
}

function parseCSV(csvText: string): string[][] {
  const lines: string[][] = []
  let currentRow: string[] = []
  let currentVal = ''
  let insideQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentVal)
      currentVal = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++
      currentRow.push(currentVal)
      currentVal = ''
      if (currentRow.some((cell) => cell.length > 0)) {
        lines.push(currentRow)
      }
      currentRow = []
    } else {
      currentVal += char
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal)
    lines.push(currentRow)
  }

  return lines
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
  const sheetId = getSpreadsheetId()
  const token = getToken()

  if (token) {
    try {
      const res = await apiFetch(`/values/${encodeURIComponent(sheetName)}`)
      const data = (await res.json()) as { values?: string[][] }
      if (data.values) return data.values
    } catch (err) {
      console.warn(`v4 API fetch failed for ${sheetName}, falling back to GViz CSV:`, err)
    }
  }

  // Fallback to public GViz CSV export endpoint
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet ${sheetName} via GViz: ${res.statusText}`)
  }
  const csvText = await res.text()
  return parseCSV(csvText)
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
  try {
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
  } catch {
    // If v4 API info is unavailable (e.g. read-only GViz mode), ignore
  }
}

export function parseRowsToObjects(rows: string[][]): Record<string, unknown>[] {
  if (rows.length < 1) return []

  // Smart recovery for space-concatenated cells in header row (e.g. "id 414b5832... 393fd338...")
  if (rows[0]?.[0]?.startsWith('id ')) {
    const results: Record<string, unknown>[] = []
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      if (r === 0 && row[0]?.startsWith('id ')) {
        const ids = row[0].split(/\s+/).filter(Boolean)
        const dreamIds = (row[1] || '').split(/\s+/).filter(Boolean)
        const emails = (row[2] || '').split(/\s+/).filter(Boolean)
        const statuses = (row[3] || '').split(/\s+/).filter(Boolean)
        const videoUrls = (row[4] || '').split(/\s+/).filter(Boolean)
        const createdAts = (row[6] || '').split(/\s+/).filter(Boolean)

        const count = ids.length - 1
        for (let i = 1; i <= count; i++) {
          results.push({
            id: ids[i] || '',
            dream_id: dreamIds[i] || '',
            email: emails[i] || '',
            status: statuses[i] || 'done',
            video_url: videoUrls[i] && videoUrls[i] !== 'video_url' ? videoUrls[i] : '',
            with_character: false,
            created_at: createdAts[i] && createdAts[i] !== 'created_at' ? createdAts[i] : new Date().toISOString(),
            updated_at: '',
          })
        }
      } else if (r > 0) {
        const headers = rows[0].map((h) => h.split(/\s+/)[0].trim())
        const obj: Record<string, unknown> = {}
        headers.forEach((h, i) => {
          if (h && row[i] !== undefined) {
            obj[h] = row[i]?.trim() || ''
          }
        })
        if (obj.id && obj.id !== 'id') {
          results.push(obj)
        }
      }
    }
    return results
  }

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
