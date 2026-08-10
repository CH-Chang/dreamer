import type { User } from '../../types/user'
import type { IUserRepository } from '../interfaces/IUserRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, fetchSheetAsRows, updateSheetRow } from '../../lib/googleSheetsClient'

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const users = await query<User>('SELECT * FROM users WHERE email = ?', [email])
    return users[0] || null
  }

  async findCount(): Promise<number> {
    const result = await query<{ count: number }>('SELECT COUNT(*) as count FROM users')
    return result[0]?.count ?? 0
  }

  async create(user: Omit<User, 'created_at'>): Promise<User> {
    const now = new Date().toISOString()
    const newUser: User = { ...user, created_at: now }
    await appendSheetRow('users', [[
      newUser.email, newUser.name, newUser.avatar_url || '', newUser.role, newUser.created_at,
    ]])
    return newUser
  }

  async update(email: string, data: Partial<Omit<User, 'email' | 'created_at'>>): Promise<void> {
    const rows = await fetchSheetAsRows('users')
    if (rows.length < 2) throw new Error('User not found')

    const headers = rows[0]
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === email)
    if (rowIdx === -1) throw new Error('User not found')

    const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
    const newValues = [...rows[rowIdx]]

    if (data.name !== undefined) {
      const ci = colIndex('name')
      if (ci !== -1) newValues[ci] = data.name
    }
    if (data.avatar_url !== undefined) {
      const ci = colIndex('avatar_url')
      if (ci !== -1) newValues[ci] = data.avatar_url
    }
    if (data.role !== undefined) {
      const ci = colIndex('role')
      if (ci !== -1) newValues[ci] = data.role
    }

    await updateSheetRow('users', rowIdx + 1, newValues)

    const updates: string[] = []
    const params: unknown[] = []
    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
    if (data.avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(data.avatar_url) }
    if (data.role !== undefined) { updates.push('role = ?'); params.push(data.role) }
    if (updates.length > 0) {
      params.push(email)
      await query(`UPDATE users SET ${updates.join(', ')} WHERE email = ?`, params)
    }
  }
}
