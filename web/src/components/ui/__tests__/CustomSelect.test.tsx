import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CustomSelect } from '../CustomSelect'

describe('CustomSelect', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2', description: 'Second option' },
    { value: 'opt3', label: 'Option 3' },
  ]

  it('renders with current selected value label', () => {
    render(<CustomSelect value="opt1" onChange={vi.fn()} options={options} />)
    const button = screen.getByRole('combobox')
    expect(button).toHaveTextContent('Option 1')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens dropdown when clicked and lists all options', () => {
    render(<CustomSelect value="opt1" onChange={vi.fn()} options={options} />)
    const button = screen.getByRole('combobox')
    fireEvent.click(button)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByText('Second option')).toBeInTheDocument()
  })

  it('calls onChange with selected value and closes dropdown', async () => {
    const onChange = vi.fn()
    render(<CustomSelect value="opt1" onChange={onChange} options={options} />)

    const button = screen.getByRole('combobox')
    fireEvent.click(button)

    const option2 = screen.getByRole('option', { name: /Option 2/ })
    fireEvent.click(option2)

    expect(onChange).toHaveBeenCalledWith('opt2')
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('closes dropdown when clicking outside or pressing Escape', async () => {
    render(
      <div>
        <CustomSelect value="opt1" onChange={vi.fn()} options={options} />
        <div data-testid="outside">Outside area</div>
      </div>
    )

    const button = screen.getByRole('combobox')
    fireEvent.click(button)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    // Test click outside
    fireEvent.click(button)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('respects disabled prop', () => {
    render(<CustomSelect value="opt1" onChange={vi.fn()} options={options} disabled />)
    const button = screen.getByRole('combobox')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
