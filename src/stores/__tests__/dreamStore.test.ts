import { describe, it, expect, beforeEach } from 'vitest'
import { useDreamStore } from '../dreamStore'
import type { Dream } from '../../types/dream'

describe('dreamStore', () => {
  beforeEach(() => {
    useDreamStore.setState({
      dreams: [],
      selectedDate: null,
      currentMonth: { year: 2026, month: 6 },
    })
  })

  it('has default current month', () => {
    const state = useDreamStore.getState()
    expect(state.currentMonth).toBeDefined()
    expect(state.dreams).toEqual([])
    expect(state.selectedDate).toBeNull()
  })

  it('sets dreams', () => {
    const dreams: Dream[] = [
      {
        id: '1', email: 'a@b.com', date: '2026-07-05',
        description: 'test', tags: [], created_at: '', updated_at: '',
      },
    ]
    useDreamStore.getState().setDreams(dreams)
    expect(useDreamStore.getState().dreams).toEqual(dreams)
  })

  it('sets selected date', () => {
    useDreamStore.getState().setSelectedDate('2026-07-05')
    expect(useDreamStore.getState().selectedDate).toBe('2026-07-05')
  })

  it('adds a dream', () => {
    const dream: Dream = {
      id: '1', email: 'a@b.com', date: '2026-07-05',
      description: 'test', tags: [], created_at: '', updated_at: '',
    }
    useDreamStore.getState().addDream(dream)
    expect(useDreamStore.getState().dreams).toHaveLength(1)
    expect(useDreamStore.getState().dreams[0]).toEqual(dream)
  })

  it('sets current month', () => {
    useDreamStore.getState().setCurrentMonth(2027, 0)
    const state = useDreamStore.getState()
    expect(state.currentMonth).toEqual({ year: 2027, month: 0 })
  })
})
