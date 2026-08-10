import type { IUserRepository } from './interfaces/IUserRepository'
import type { IDreamRepository } from './interfaces/IDreamRepository'
import type { IVideoRepository } from './interfaces/IVideoRepository'
import type { ICategoryRepository } from './interfaces/ICategoryRepository'
import type { IComicRepository } from './interfaces/IComicRepository'
import type { IRateLimitRepository } from './interfaces/IRateLimitRepository'
import type { ICommentRepository } from './interfaces/ICommentRepository'
import type { IEditLogRepository } from './interfaces/IEditLogRepository'
import { HttpUserRepository } from './http/HttpUserRepository'
import { HttpDreamRepository } from './http/HttpDreamRepository'
import { HttpVideoRepository } from './http/HttpVideoRepository'
import { HttpCategoryRepository } from './http/HttpCategoryRepository'
import { HttpComicRepository } from './http/HttpComicRepository'
import { HttpRateLimitRepository } from './http/HttpRateLimitRepository'
import { HttpCommentRepository } from './http/HttpCommentRepository'
import { HttpEditLogRepository } from './http/HttpEditLogRepository'

let userRepo: IUserRepository
let dreamRepo: IDreamRepository
let videoRepo: IVideoRepository
let categoryRepo: ICategoryRepository
let comicRepo: IComicRepository
let rateLimitRepo: IRateLimitRepository
let commentRepo: ICommentRepository
let editLogRepo: IEditLogRepository

export function getUserRepository(): IUserRepository {
  if (!userRepo) userRepo = new HttpUserRepository()
  return userRepo
}

export function getDreamRepository(): IDreamRepository {
  if (!dreamRepo) dreamRepo = new HttpDreamRepository()
  return dreamRepo
}

export function getVideoRepository(): IVideoRepository {
  if (!videoRepo) videoRepo = new HttpVideoRepository()
  return videoRepo
}

export function getCategoryRepository(): ICategoryRepository {
  if (!categoryRepo) categoryRepo = new HttpCategoryRepository()
  return categoryRepo
}

export function getComicRepository(): IComicRepository {
  if (!comicRepo) comicRepo = new HttpComicRepository()
  return comicRepo
}

export function getRateLimitRepository(): IRateLimitRepository {
  if (!rateLimitRepo) rateLimitRepo = new HttpRateLimitRepository()
  return rateLimitRepo
}

export function getCommentRepository(): ICommentRepository {
  if (!commentRepo) commentRepo = new HttpCommentRepository()
  return commentRepo
}

export function getEditLogRepository(): IEditLogRepository {
  if (!editLogRepo) editLogRepo = new HttpEditLogRepository()
  return editLogRepo
}
