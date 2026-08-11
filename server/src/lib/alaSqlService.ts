import alasql from 'alasql'
import {
  fetchSheetAsRows,
  parseRowsToObjects,
  ensureSheetsExist,
} from './googleSheetsClient'

alasql.fn.STRFTIME = ((fmt: string, date: string): string => {
  const d = date === 'now' || date === "'now'" ? new Date() : new Date(date)
  if (isNaN(d.getTime())) return ''
  const map: Record<string, string> = {
    '%Y': String(d.getFullYear()),
    '%m': String(d.getMonth() + 1).padStart(2, '0'),
    '%d': String(d.getDate()).padStart(2, '0'),
  }
  let result = fmt
  for (const [k, v] of Object.entries(map)) result = result.replace(k, v)
  return result
}) as any
alasql.fn.strftime = alasql.fn.STRFTIME

let dbInited = false
let initializingPromise: Promise<void> | null = null

const SHEET_NAMES = ['users', 'dreams', 'videos', 'categories', 'comics', 'rate_limits', 'comments', 'edit_logs'] as const

export async function initDatabase(force = false): Promise<void> {
  if (dbInited && !force) return
  if (initializingPromise && !force) return initializingPromise

  initializingPromise = (async () => {
    try {
      await ensureSheetsExist([...SHEET_NAMES])
    } catch {
      // Sheets info unavailable — proceed with table sync
    }

    for (const sheetName of SHEET_NAMES) {
      try {
        const rows = await fetchSheetAsRows(sheetName)
        const objects = parseRowsToObjects(rows)
        await alasql.promise(`DROP TABLE IF EXISTS ${sheetName}`)
        if (objects.length > 0) {
          await alasql.promise(`CREATE TABLE ${sheetName}`)
          await alasql.promise(`INSERT INTO ${sheetName} SELECT * FROM ?`, [objects])
        } else {
          await alasql.promise(`CREATE TABLE ${sheetName} (dummy TEXT)`)
        }
      } catch (err) {
        console.warn(`Failed to fetch and parse sheet ${sheetName}:`, err)
        await alasql.promise(`DROP TABLE IF EXISTS ${sheetName}`)
        await alasql.promise(`CREATE TABLE ${sheetName} (dummy TEXT)`)
      }
    }
    dbInited = true
    initializingPromise = null
  })()

  return initializingPromise
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  if (!dbInited) {
    await initDatabase()
  }
  return alasql.promise(sql, params)
}

export function isInitialized(): boolean {
  return dbInited
}

export function reset(): void {
  dbInited = false
  initializingPromise = null
}
