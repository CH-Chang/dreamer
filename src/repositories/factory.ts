import type { IUserRepository } from './interfaces/IUserRepository'
import type { IDreamRepository } from './interfaces/IDreamRepository'
import type { IVideoRepository } from './interfaces/IVideoRepository'
import type { ICategoryRepository } from './interfaces/ICategoryRepository'
import type { IComicRepository } from './interfaces/IComicRepository'
import type { IRateLimitRepository } from './interfaces/IRateLimitRepository'
import { UserRepository } from './sheets/UserRepository'
import { DreamRepository } from './sheets/DreamRepository'
import { VideoRepository } from './sheets/VideoRepository'
import { CategoryRepository } from './sheets/CategoryRepository'
import { ComicRepository } from './sheets/ComicRepository'
import { RateLimitRepository } from './sheets/RateLimitRepository'

let userRepo: IUserRepository
let dreamRepo: IDreamRepository
let videoRepo: IVideoRepository
let categoryRepo: ICategoryRepository
let comicRepo: IComicRepository
let rateLimitRepo: IRateLimitRepository

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

export function getCategoryRepository(): ICategoryRepository {
  if (!categoryRepo) categoryRepo = new CategoryRepository()
  return categoryRepo
}

export function getComicRepository(): IComicRepository {
  if (!comicRepo) comicRepo = new ComicRepository()
  return comicRepo
}

export function getRateLimitRepository(): IRateLimitRepository {
  if (!rateLimitRepo) rateLimitRepo = new RateLimitRepository()
  return rateLimitRepo
}
