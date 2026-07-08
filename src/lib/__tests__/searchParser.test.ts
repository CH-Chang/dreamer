import { describe, it, expect } from 'vitest'
import { parseSearchQuery } from '../searchParser'

describe('parseSearchQuery', () => {
  it('parses plain text', () => {
    expect(parseSearchQuery('天空 雲')).toEqual({ tags: [], since: '', to: '', text: '天空 雲' })
  })

  it('parses #tag', () => {
    expect(parseSearchQuery('#旅行')).toEqual({ tags: ['旅行'], since: '', to: '', text: '' })
  })

  it('parses multiple #tags', () => {
    expect(parseSearchQuery('#旅行 #工作')).toEqual({ tags: ['旅行', '工作'], since: '', to: '', text: '' })
  })

  it('parses since: full date', () => {
    expect(parseSearchQuery('since:2025-01-01')).toEqual({ tags: [], since: '2025-01-01', to: '', text: '' })
  })

  it('parses since: year-month', () => {
    expect(parseSearchQuery('since:2025-01')).toEqual({ tags: [], since: '2025-01-01', to: '', text: '' })
  })

  it('parses since: year', () => {
    expect(parseSearchQuery('since:2025')).toEqual({ tags: [], since: '2025-01-01', to: '', text: '' })
  })

  it('parses to: full date', () => {
    expect(parseSearchQuery('to:2025-06-30')).toEqual({ tags: [], since: '', to: '2025-06-30', text: '' })
  })

  it('parses to: year-month', () => {
    expect(parseSearchQuery('to:2025-06')).toEqual({ tags: [], since: '', to: '2025-06-30', text: '' })
  })

  it('parses to: year', () => {
    expect(parseSearchQuery('to:2025')).toEqual({ tags: [], since: '', to: '2025-12-31', text: '' })
  })

  it('parses mixed query', () => {
    const result = parseSearchQuery('#旅行 since:2025-01 to:2025-06 天空')
    expect(result).toEqual({
      tags: ['旅行'],
      since: '2025-01-01',
      to: '2025-06-30',
      text: '天空',
    })
  })

  it('handles empty input', () => {
    expect(parseSearchQuery('')).toEqual({ tags: [], since: '', to: '', text: '' })
  })
})
