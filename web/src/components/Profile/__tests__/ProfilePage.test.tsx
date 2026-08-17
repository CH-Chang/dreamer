import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProfilePage } from '../ProfilePage'
import { useAuthStore } from '../../../stores/authStore'
import type { User } from '../../../types/user'

const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockFindAllByEmail = vi.fn().mockResolvedValue([
  { id: '1', email: 'test@example.com', title: 'Dream 1', content: 'Test dream', date: '2026-08-01', visibility: 'public' },
])

vi.mock('../../../repositories/factory', () => ({
  getUserRepository: () => ({
    update: mockUpdate,
    findByEmail: vi.fn(),
    findCount: vi.fn(),
    create: vi.fn(),
  }),
  getDreamRepository: () => ({
    findAllByEmail: mockFindAllByEmail,
  }),
}))

vi.mock('../../../lib/rateLimitService', () => ({
  rateLimitService: {
    getUsage: vi.fn().mockResolvedValue({ daily: 1, monthly: 5 }),
    getLimit: vi.fn().mockResolvedValue({ daily: 10, monthly: 50 }),
  },
}))

vi.mock('../../../lib/useDriveImage', () => ({
  useDriveImage: vi.fn().mockReturnValue(null),
}))

describe('ProfilePage', () => {
  const dummyUser: User = {
    email: 'test@example.com',
    name: 'Test Dreamer',
    role: 'user',
    created_at: '2026-08-01T00:00:00Z',
    language: 'zh-TW',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      avatarBase64: null,
    })
  })

  it('renders nothing when user is not logged in', () => {
    const { container } = render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders user details and default language dropdown when logged in', async () => {
    useAuthStore.setState({
      user: dummyUser,
      token: 'fake-jwt-token',
      isAuthenticated: true,
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Test Dreamer')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText(/偏好語言/)).toBeInTheDocument()

    const combobox = screen.getByRole('combobox', { name: '偏好語言' })
    expect(combobox).toHaveTextContent('繁體中文 (zh-TW)')
    await waitFor(() => expect(screen.getByText(/我的配額使用/)).toBeInTheDocument())
  })

  it('renders custom language preference correctly', async () => {
    useAuthStore.setState({
      user: { ...dummyUser, language: 'en-US' },
      token: 'fake-jwt-token',
      isAuthenticated: true,
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )

    const combobox = await screen.findByRole('combobox', { name: '偏好語言' })
    expect(combobox).toHaveTextContent('English (en-US)')
    await waitFor(() => expect(screen.getByText(/我的配額使用/)).toBeInTheDocument())
  })

  it('updates language preference via UserRepository and updates authStore state', async () => {
    useAuthStore.setState({
      user: dummyUser,
      token: 'fake-jwt-token',
      isAuthenticated: true,
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )

    const combobox = screen.getByRole('combobox', { name: '偏好語言' })
    fireEvent.click(combobox)

    const englishOption = screen.getByRole('option', { name: 'English (en-US)' })
    fireEvent.click(englishOption)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('test@example.com', { language: 'en-US' })
    })

    expect(useAuthStore.getState().user?.language).toBe('en-US')
  })

  it('handles error gracefully when repository update fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockUpdate.mockRejectedValueOnce(new Error('Network error'))

    useAuthStore.setState({
      user: dummyUser,
      token: 'fake-jwt-token',
      isAuthenticated: true,
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )

    const combobox = screen.getByRole('combobox', { name: '偏好語言' })
    fireEvent.click(combobox)

    const zhCnOption = screen.getByRole('option', { name: '简体中文 (zh-CN)' })
    fireEvent.click(zhCnOption)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('test@example.com', { language: 'zh-CN' })
      expect(alertMock).toHaveBeenCalledWith('更新語言偏好失敗，請稍後再試')
    })

    alertMock.mockRestore()
    consoleErrorMock.mockRestore()
  })
})
