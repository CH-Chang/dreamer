import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from '../Spinner'
import { DreamPulse } from '../DreamPulse'
import {
  Skeleton,
  DreamDetailSkeleton,
  MediaFeedSkeleton,
  CommentListSkeleton,
  SearchListSkeleton,
  FeedSkeleton,
  ProfileStatsSkeleton,
} from '../Skeleton'

describe('Loading UI Components', () => {
  it('renders Spinner with accessible role and label', () => {
    render(<Spinner size="md" variant="dark" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', '載入中')
    expect(spinner).toHaveClass('animate-spin')
  })

  it('renders DreamPulse with optional text', () => {
    render(<DreamPulse text="AI 生成中..." />)
    expect(screen.getByText('AI 生成中...')).toBeInTheDocument()
  })

  it('renders base Skeleton', () => {
    render(<Skeleton className="h-4 w-20" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders DreamDetailSkeleton', () => {
    render(<DreamDetailSkeleton />)
    expect(screen.getByRole('status', { name: '載入夢境詳情中' })).toBeInTheDocument()
  })

  it('renders MediaFeedSkeleton', () => {
    render(<MediaFeedSkeleton />)
    expect(screen.getByRole('status', { name: '載入媒體中' })).toBeInTheDocument()
  })

  it('renders CommentListSkeleton', () => {
    render(<CommentListSkeleton />)
    expect(screen.getByRole('status', { name: '載入留言中' })).toBeInTheDocument()
  })

  it('renders SearchListSkeleton', () => {
    render(<SearchListSkeleton />)
    expect(screen.getByRole('status', { name: '搜尋夢境中' })).toBeInTheDocument()
  })

  it('renders FeedSkeleton', () => {
    render(<FeedSkeleton />)
    expect(screen.getByRole('status', { name: '載入探索牆中' })).toBeInTheDocument()
  })

  it('renders ProfileStatsSkeleton', () => {
    render(<ProfileStatsSkeleton />)
    expect(screen.getByRole('status', { name: '載入統計中' })).toBeInTheDocument()
  })
})
