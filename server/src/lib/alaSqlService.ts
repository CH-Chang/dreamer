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

const SHEET_NAMES = ['users', 'dreams', 'videos', 'categories', 'comics', 'rate_limits', 'comments', 'edit_logs'] as const

export async function initDatabase(force = false): Promise<void> {
  if (dbInited && !force) return
  dbInited = false

  try {
    await ensureSheetsExist([...SHEET_NAMES])
  } catch {
    // Sheets unavailable — proceed with empty tables
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
    } catch {
      await alasql.promise(`DROP TABLE IF EXISTS ${sheetName}`)
      await alasql.promise(`CREATE TABLE ${sheetName} (dummy TEXT)`)
    }
  }
  dbInited = true
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  if (!dbInited) {
    await alasql.promise(`CREATE TABLE IF NOT EXISTS users (email STRING, name STRING, avatar_url STRING, role STRING, created_at STRING)`)
    await alasql.promise(`CREATE TABLE IF NOT EXISTS dreams (id STRING, email STRING, title STRING, date STRING, description STRING, visibility STRING, tags STRING, title_candidates STRING, created_at STRING, updated_at STRING)`)
    await alasql.promise(`CREATE TABLE IF NOT EXISTS videos (id STRING, dream_id STRING, user_email STRING, status STRING, video_url STRING, prompt STRING, created_at STRING)`)
    await alasql.promise(`CREATE TABLE IF NOT EXISTS categories (id STRING, name STRING, color STRING, created_at STRING)`)
    await alasql.promise(`CREATE TABLE IF NOT EXISTS comics (id STRING, dream_id STRING, user_email STRING, status STRING, image_urls STRING, prompt STRING, created_at STRING)`)
    await alasql.promise(`CREATE TABLE IF NOT EXISTS rate_limits (type STRING, identifier STRING, [count] INT, window_start INT)`)
    await alasql.promise(`CREATE TABLE IF NOT EXISTS comments (id STRING, dream_id STRING, user_email STRING, user_name STRING, content STRING, created_at STRING)`)
    await alasql.promise(`CREATE TABLE IF NOT EXISTS edit_logs (id STRING, dream_id STRING, user_email STRING, action STRING, created_at STRING)`)
    dbInited = true
  }
  return alasql.promise(sql, params)
}

export function isInitialized(): boolean {
  return dbInited
}

export function reset(): void {
  dbInited = false
}
