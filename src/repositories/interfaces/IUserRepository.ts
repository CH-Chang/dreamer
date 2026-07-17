import type { User } from '../../types/user'

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  findCount(): Promise<number>
  create(user: Omit<User, 'created_at'>): Promise<User>
  update(email: string, data: Partial<Omit<User, 'email' | 'created_at'>>): Promise<void>
}
