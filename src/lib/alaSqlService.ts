import alasql from 'alasql'
import { rateLimitService } from './rateLimitService'
import {
  fetchSheetAsRows,
  parseRowsToObjects,
  ensureSheetsExist,
} from './googleSheetsClient'

let dbInited = false

const SHEET_NAMES = ['users', 'dreams', 'videos', 'categories', 'comics', 'rate_limits'] as const

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
  try {
    await rateLimitService.initDefaults()
  } catch {
    // Non-critical
  }
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  if (!dbInited) throw new Error('Database not initialized. Call initDatabase() first.')
  return alasql.promise(sql, params)
}

export function isInitialized(): boolean {
  return dbInited
}

export function reset(): void {
  dbInited = false
}
