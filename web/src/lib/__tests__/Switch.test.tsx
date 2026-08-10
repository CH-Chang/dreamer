import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '../../components/ui/Switch'

describe('Switch', () => {
  it('renders unchecked state with label 私有', () => {
    render(<Switch checked={false} onChange={() => {}} />)
    expect(screen.getByText('私有')).toBeInTheDocument()
  })

  it('renders checked state with label 公開', () => {
    render(<Switch checked={true} onChange={() => {}} />)
    expect(screen.getByText('公開')).toBeInTheDocument()
  })

  it('calls onChange when clicked', () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when currently checked', () => {
    const onChange = vi.fn()
    render(<Switch checked={true} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
