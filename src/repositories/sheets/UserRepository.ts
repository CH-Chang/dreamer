import type { User } from '../../types/user'
import type { IUserRepository } from '../interfaces/IUserRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow } from '../../lib/googleSheetsClient'

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const users = await query<User>('SELECT * FROM users WHERE email = ?', [email])
    return users[0] || null
  }

  async create(user: Omit<User, 'created_at'>): Promise<User> {
    const now = new Date().toISOString()
    const newUser: User = { ...user, created_at: now }
    await appendSheetRow('users', [[
      newUser.email, newUser.name, newUser.avatar_url || '', newUser.created_at,
    ]])
    return newUser
  }
}
