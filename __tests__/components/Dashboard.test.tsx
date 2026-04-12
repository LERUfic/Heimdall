import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Dashboard from '@/app/page'
import { SWRConfig } from 'swr'

// Mock Next.js Navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Dashboard Component - Final Stability', () => {
  const mockUser = { id: 'u1', username: 'admin', role: 'APPROVER' }
  const mockRequests = [
    { id: 'req1', method: 'GET', url: 'h1', status: 'PENDING', requester: { username: 'o' }, createdAt: new Date().toISOString() },
    { id: 'req2', method: 'POST', url: 'h2', status: 'EXECUTED', response: JSON.stringify({ status: 200 }), createdAt: new Date().toISOString() }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    global.fetch = vi.fn()
    global.sessionStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), length: 0, key: vi.fn() } as any
  })

  afterEach(() => { vi.useRealTimers() })

  const renderDashboard = () => {
    return render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <Dashboard />
      </SWRConfig>
    )
  }

  const mockSuccess = (user: any, reqs: any[]) => {
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/auth/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ user }) })
      if (url.includes('/api/requests')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ requests: reqs }) })
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
  }

  it('covers interactive success paths, logout and error handling', async () => {
    mockSuccess(mockUser, mockRequests)
    renderDashboard()

    const row = await screen.findByText(/req1/i)
    expect(row).toBeDefined()

    // 1. Success Action
    const approveBtn = screen.getByRole('button', { name: /Approve/i })
    fireEvent.click(approveBtn)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/approve'), expect.any(Object)))

    // 2. Failed Action
    ;(global.fetch as any).mockImplementationOnce(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) }))
    fireEvent.click(screen.getByRole('button', { name: /Reject/i }))
    await waitFor(() => expect(screen.getByText(/Failed: Failed/i)).toBeDefined())

    // 3. Clone & Logout
    fireEvent.click(screen.getAllByRole('button', { name: /Clone/i })[0])
    expect(mockPush).toHaveBeenCalledWith('/create')
    
    fireEvent.click(screen.getByRole('button', { name: /Logout/i }))
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.any(Object))

    // 4. Keyboard Esc
    fireEvent.keyDown(window, { key: 'Escape' })
  })

  it('covers empty states and template saving', async () => {
    mockSuccess(mockUser, [])
    const { unmount } = renderDashboard()
    await screen.findByText(/No audit requests pending review/i)
    unmount()

    // Template save
    mockSuccess(mockUser, mockRequests)
    renderDashboard()
    await screen.findByText(/req1/i)
    fireEvent.click(screen.getAllByRole('button', { name: /Save/i })[0])
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByPlaceholderText(/Production Cache Purge/i), { target: { value: 'T' } })
    fireEvent.click(screen.getByText('Confirm Save'))
    expect(global.fetch).toHaveBeenCalledWith('/api/collections', expect.objectContaining({ method: 'POST' }))
  })
})
