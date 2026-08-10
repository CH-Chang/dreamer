import type { Video, VideoStatus } from '../../../../shared/types/video'
import type { IVideoRepository } from '../../../../shared/interfaces/IVideoRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class VideoRepository implements IVideoRepository {
  async findByDreamId(dreamId: string): Promise<Video | null> {
    const videos = await this.findAllByDreamId(dreamId)
    return videos[0] || null
  }

  async findAllByDreamId(dreamId: string): Promise<Video[]> {
    return query<Video>(
      'SELECT * FROM videos WHERE dream_id = ? ORDER BY created_at DESC',
      [dreamId],
    )
  }

  async create(input: { dream_id: string; email: string; with_character?: boolean }): Promise<Video> {
    const now = new Date().toISOString()
    const withCharacter = input.with_character ?? false
    const video: Video = {
      id: generateId(),
      dream_id: input.dream_id,
      email: input.email,
      status: 'pending',
      with_character: withCharacter,
      created_at: now,
    }
    try {
      await appendSheetRow('videos', [[
        video.id, video.dream_id, video.email, video.status, '', withCharacter ? 'TRUE' : 'FALSE', video.created_at, '',
      ]])
    } catch {
      // Sheets offline
    }
    await query(
      `INSERT INTO videos (id, dream_id, email, status, video_url, with_character, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [video.id, video.dream_id, video.email, video.status, '', withCharacter, video.created_at, ''],
    )
    return video
  }

  async updateStatus(id: string, status: VideoStatus, videoUrl?: string): Promise<Video> {
    const now = new Date().toISOString()
    const updateFields = ["status = ?", "updated_at = ?"]
    const updateValues: unknown[] = [status, now]
    if (videoUrl !== undefined) {
      updateFields.push("video_url = ?")
      updateValues.push(videoUrl)
    }
    updateValues.push(id)
    await query(`UPDATE videos SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)

    try {
      const rows = await fetchSheetAsRows('videos')
      if (rows.length >= 2) {
        const headers = rows[0]
        const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
        if (rowIdx !== -1) {
          const newValues = [...rows[rowIdx]]
          const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
          const statusCol = colIndex('status')
          if (statusCol !== -1) newValues[statusCol] = status
          if (videoUrl !== undefined) {
            const urlCol = colIndex('video_url')
            if (urlCol !== -1) newValues[urlCol] = videoUrl
          }
          const updatedAtCol = colIndex('updated_at')
          if (updatedAtCol !== -1) newValues[updatedAtCol] = now
          await updateSheetRow('videos', rowIdx + 1, newValues)
        }
      }
    } catch {
      // Sheets offline
    }

    const videos = await query<Video>('SELECT * FROM videos WHERE id = ?', [id])
    if (videos.length === 0) throw new Error('Video not found')
    return videos[0]
  }
}
