import type { User, SupportedLanguage } from '../../../../shared/types/user'
import type { IUserRepository } from '../../../../shared/interfaces/IUserRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, fetchSheetAsRows, updateSheetRow } from '../../lib/googleSheetsClient'

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    try {
      const users = await query<User>('SELECT * FROM users WHERE email = ?', [email])
      if (!users[0]) return null
      return {
        ...users[0],
        language: (users[0].language as SupportedLanguage) || 'zh-TW',
      }
    } catch {
      return null
    }
  }

  async findCount(): Promise<number> {
    try {
      const result = await query<any>('SELECT COUNT(*) as cnt FROM users')
      if (!result || result.length === 0) return 0
      const val = result[0].cnt ?? result[0]['COUNT(*)'] ?? Object.values(result[0])[0]
      return typeof val === 'number' ? val : 0
    } catch {
      return 0
    }
  }

  async create(user: Omit<User, 'created_at'>): Promise<User> {
    const now = new Date().toISOString()
    const language: SupportedLanguage = (user.language as SupportedLanguage) || 'zh-TW'
    const newUser: User = { ...user, language, created_at: now }
    try {
      await appendSheetRow('users', [[
        newUser.email, newUser.name, newUser.avatar_url || '', newUser.role, newUser.created_at, newUser.language || 'zh-TW',
      ]])
    } catch (err) {
      console.error('Failed to append user to Google Sheets:', err)
    }
    try {
      await query(
        'INSERT INTO users (email, name, avatar_url, role, created_at, language) VALUES (?, ?, ?, ?, ?, ?)',
        [newUser.email, newUser.name, newUser.avatar_url || '', newUser.role, newUser.created_at, newUser.language],
      )
    } catch {
      // In-memory insert fallback
    }
    return newUser
  }

  async update(email: string, data: Partial<Omit<User, 'email' | 'created_at'>>): Promise<void> {
    const updates: string[] = []
    const params: unknown[] = []
    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
    if (data.avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(data.avatar_url) }
    if (data.role !== undefined) { updates.push('role = ?'); params.push(data.role) }
    if (data.language !== undefined) { updates.push('language = ?'); params.push(data.language) }
    if (updates.length > 0) {
      params.push(email)
      try {
        await query(`UPDATE users SET ${updates.join(', ')} WHERE email = ?`, params)
      } catch {
        // Fallback
      }
    }

    try {
      const rows = await fetchSheetAsRows('users')
      if (rows.length >= 2) {
        const headers = rows[0]
        const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === email)
        if (rowIdx !== -1) {
          const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
          const newValues = [...rows[rowIdx]]
          if (data.name !== undefined) { const ci = colIndex('name'); if (ci !== -1) newValues[ci] = data.name }
          if (data.avatar_url !== undefined) { const ci = colIndex('avatar_url'); if (ci !== -1) newValues[ci] = data.avatar_url }
          if (data.role !== undefined) { const ci = colIndex('role'); if (ci !== -1) newValues[ci] = data.role }
          if (data.language !== undefined) { const ci = colIndex('language'); if (ci !== -1) newValues[ci] = data.language }
          await updateSheetRow('users', rowIdx + 1, newValues)
        }
      }
    } catch (err) {
      console.error('Failed to update user in Google Sheets:', err)
    }
  }
}

