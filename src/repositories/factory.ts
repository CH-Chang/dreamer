import type { IUserRepository } from './interfaces/IUserRepository'
import type { IDreamRepository } from './interfaces/IDreamRepository'
import type { IVideoRepository } from './interfaces/IVideoRepository'
import { UserRepository } from './sheets/UserRepository'
import { DreamRepository } from './sheets/DreamRepository'
import { VideoRepository } from './sheets/VideoRepository'

let userRepo: IUserRepository
let dreamRepo: IDreamRepository
let videoRepo: IVideoRepository

export function getUserRepository(): IUserRepository {
  if (!userRepo) userRepo = new UserRepository()
  return userRepo
}

export function getDreamRepository(): IDreamRepository {
  if (!dreamRepo) dreamRepo = new DreamRepository()
  return dreamRepo
}

export function getVideoRepository(): IVideoRepository {
  if (!videoRepo) videoRepo = new VideoRepository()
  return videoRepo
}
