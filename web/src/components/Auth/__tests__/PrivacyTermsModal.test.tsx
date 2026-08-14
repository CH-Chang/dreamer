import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PrivacyTermsModal } from '../PrivacyTermsModal'

describe('PrivacyTermsModal', () => {
  const originalNavigator = window.navigator

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    })
  })

  const mockNavigatorLanguage = (lang: string) => {
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, language: lang },
      configurable: true,
      writable: true,
    })
  }

  it('does not render when open is false', () => {
    const { container } = render(
      <PrivacyTermsModal
        open={false}
        userEmail="test@example.com"
        userName="Test User"
        onAccept={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders modal with user information and default zh-TW language', () => {
    mockNavigatorLanguage('zh-TW')
    render(
      <PrivacyTermsModal
        open={true}
        userEmail="test@example.com"
        userName="Test User"
        onAccept={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText(/Test User/)).toBeInTheDocument()
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument()
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('zh-TW')
  })

  it('autodetects en-US when browser language starts with en', () => {
    mockNavigatorLanguage('en-US')
    render(
      <PrivacyTermsModal
        open={true}
        userEmail="test@example.com"
        userName="Test User"
        onAccept={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('en-US')
  })

  it('autodetects zh-CN when browser language starts with zh-CN', () => {
    mockNavigatorLanguage('zh-CN')
    render(
      <PrivacyTermsModal
        open={true}
        userEmail="test@example.com"
        userName="Test User"
        onAccept={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('zh-CN')
  })

  it('disables accept button until terms are agreed', () => {
    render(
      <PrivacyTermsModal
        open={true}
        userEmail="test@example.com"
        userName="Test User"
        onAccept={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const acceptButton = screen.getByRole('button', { name: '同意條款並完成註冊' })
    expect(acceptButton).toBeDisabled()

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(acceptButton).not.toBeDisabled()
  })

  it('calls onAccept with selected language when agreed and submitted', () => {
    mockNavigatorLanguage('zh-TW')
    const onAccept = vi.fn()
    render(
      <PrivacyTermsModal
        open={true}
        userEmail="test@example.com"
        userName="Test User"
        onAccept={onAccept}
        onCancel={vi.fn()}
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'en-US' } })

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    const acceptButton = screen.getByRole('button', { name: '同意條款並完成註冊' })
    fireEvent.click(acceptButton)

    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onAccept).toHaveBeenCalledWith('en-US')
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(
      <PrivacyTermsModal
        open={true}
        userEmail="test@example.com"
        userName="Test User"
        onAccept={vi.fn()}
        onCancel={onCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: '取消' })
    fireEvent.click(cancelButton)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
