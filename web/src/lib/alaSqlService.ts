import alasql from 'alasql'

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

export async function initDatabase(force = false): Promise<void> {
  if (dbInited && !force) return
  dbInited = false

  await alasql.promise(`CREATE TABLE IF NOT EXISTS users (email STRING, name STRING, avatar_url STRING, role STRING, created_at STRING)`)
  await alasql.promise(`CREATE TABLE IF NOT EXISTS dreams (id STRING, email STRING, title STRING, date STRING, description STRING, visibility STRING, tags STRING, title_candidates STRING, created_at STRING, updated_at STRING)`)
  await alasql.promise(`CREATE TABLE IF NOT EXISTS videos (id STRING, dream_id STRING, user_email STRING, status STRING, video_url STRING, prompt STRING, created_at STRING)`)
  await alasql.promise(`CREATE TABLE IF NOT EXISTS categories (id STRING, name STRING, color STRING, created_at STRING)`)
  await alasql.promise(`CREATE TABLE IF NOT EXISTS comics (id STRING, dream_id STRING, user_email STRING, status STRING, image_urls STRING, prompt STRING, created_at STRING)`)
  await alasql.promise(`CREATE TABLE IF NOT EXISTS rate_limits (type STRING, identifier STRING, [count] INT, window_start INT)`)
  await alasql.promise(`CREATE TABLE IF NOT EXISTS comments (id STRING, dream_id STRING, user_email STRING, user_name STRING, content STRING, created_at STRING)`)
  await alasql.promise(`CREATE TABLE IF NOT EXISTS edit_logs (id STRING, dream_id STRING, user_email STRING, action STRING, created_at STRING)`)

  dbInited = true
  try {
    const { rateLimitService } = await import('./rateLimitService')
    await rateLimitService.initDefaults()
  } catch {
    // Non-critical
  }
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  if (!dbInited) await initDatabase()
  return alasql.promise(sql, params)
}

export function isInitialized(): boolean {
  return dbInited
}

export function reset(): void {
  dbInited = false
}
