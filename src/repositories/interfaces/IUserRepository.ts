import type { User } from '../../types/user'

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  create(user: Omit<User, 'created_at'>): Promise<User>
}
