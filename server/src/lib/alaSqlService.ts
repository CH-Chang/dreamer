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

const TABLE_SCHEMAS: Record<string, string> = {
  users: 'email STRING PRIMARY KEY, name STRING, avatar_url STRING, role STRING, created_at STRING, language STRING, ai_mode STRING, custom_gcp_project_id STRING, custom_gcp_location STRING',
  categories: 'id STRING PRIMARY KEY, name STRING, color STRING, icon STRING, email STRING, sort_order INT, created_at STRING',
  dreams: 'id STRING PRIMARY KEY, email STRING, date STRING, description STRING, title STRING, tags STRING, visibility STRING, title_candidates STRING, created_at STRING, updated_at STRING',
  edit_logs: 'id STRING PRIMARY KEY, dream_id STRING, edited_at STRING, changes STRING, created_at STRING',
  videos: 'id STRING PRIMARY KEY, dream_id STRING, email STRING, status STRING, video_url STRING, with_character BOOLEAN, created_at STRING, updated_at STRING',
  comics: 'id STRING PRIMARY KEY, dream_id STRING, email STRING, status STRING, image_url STRING, with_character BOOLEAN, created_at STRING, updated_at STRING',
  rate_limits: 'id STRING PRIMARY KEY, type STRING, scope STRING, daily_limit INT, monthly_limit INT, created_at STRING, updated_at STRING',
  comments: 'id STRING PRIMARY KEY, dream_id STRING, target_type STRING, target_id STRING, email STRING, content STRING, parent_id STRING, mentions STRING, created_at STRING, updated_at STRING',
}

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
      const schema = TABLE_SCHEMAS[sheetName]
      try {
        const rows = await fetchSheetAsRows(sheetName)
        const objects = parseRowsToObjects(rows)
        await alasql.promise(`DROP TABLE IF EXISTS ${sheetName}`)
        if (schema) {
          await alasql.promise(`CREATE TABLE ${sheetName} (${schema})`)
        } else {
          await alasql.promise(`CREATE TABLE ${sheetName}`)
        }
        if (objects.length > 0) {
          await alasql.promise(`INSERT INTO ${sheetName} SELECT * FROM ?`, [objects])
        }
      } catch (err) {
        console.warn(`Failed to fetch and parse sheet ${sheetName}:`, err)
        await alasql.promise(`DROP TABLE IF EXISTS ${sheetName}`)
        if (schema) {
          await alasql.promise(`CREATE TABLE ${sheetName} (${schema})`)
        } else {
          await alasql.promise(`CREATE TABLE ${sheetName}`)
        }
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
