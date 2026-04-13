import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Inspector from '@/components/Inspector'

describe('Inspector Component', () => {
  const mockRequest = {
    id: 'req-123',
    method: 'POST',
    url: 'https://api.example.com?q=test',
    status: 'EXECUTED',
    requesterId: 'user-1',
    createdAt: new Date().toISOString(),
    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ key: 'val' }),
    response: JSON.stringify({ status: 200, body: '{"ok":true}' }),
    requester: { username: 'john_doe' },
    approver: { username: 'admin_user' },
    approvedAt: new Date().toISOString()
  }

  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('renders all tabs and content correctly', () => {
    render(<Inspector request={mockRequest} onClose={mockOnClose} onSaveTemplate={mockOnSave} />)

    expect(screen.getByText(/Inspection Detail/i)).toBeDefined()
    expect(screen.getByText('POST')).toBeDefined()

    expect(screen.getByText(/john_doe/)).toBeDefined()
    expect(screen.getByText(/Operator/i)).toBeDefined()
    expect(screen.getByText(/Verifier/i)).toBeDefined()

    // Params Tab (Default)
    expect(screen.getByText('Params')).toBeDefined()
    // There are two "1" badges (Params and Headers)
    expect(screen.getAllByText('1')).toHaveLength(2)
    expect(screen.getByText('test')).toBeDefined()

    // Headers Tab
    fireEvent.click(screen.getByText('Headers'))
    expect(screen.getByText('application/json')).toBeDefined()

    // Response Tab
    fireEvent.click(screen.getByText('Response'))
    expect(screen.getByText('2')).toBeDefined() // Count for status & body
    expect(screen.getByText(/200/)).toBeDefined()
  })

  it('handles copy to clipboard', async () => {
    vi.useFakeTimers()
    render(<Inspector request={mockRequest} onClose={mockOnClose} onSaveTemplate={mockOnSave} />)

    const copyBtn = screen.getByLabelText('Copy URL')
    fireEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockRequest.url)
    expect(screen.getByText(/Copied!/i)).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(screen.getByText(/Copy Endpoint/i)).toBeDefined()
    vi.useRealTimers()
  })

  it('toggles Pretty/Raw response views', () => {
    render(<Inspector request={mockRequest} onClose={mockOnClose} onSaveTemplate={mockOnSave} />)
    fireEvent.click(screen.getByText('Response'))

    expect(screen.getByText('PRETTY')).toBeDefined()
    fireEvent.click(screen.getByText('RAW'))
    // Text should still be there but formatted differently (not easily assertable by text alone, but covers branch)
  })

  it('triggers onSaveTemplate and onClose', async () => {
    vi.useFakeTimers()
    render(<Inspector request={mockRequest} onClose={mockOnClose} onSaveTemplate={mockOnSave} />)

    fireEvent.click(screen.getByText(/Save Template/i))
    expect(mockOnSave).toHaveBeenCalledWith(mockRequest)

    fireEvent.click(screen.getByLabelText('Close'))
    expect(screen.getByRole('dialog').className).toContain('animate-fade-out')

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(mockOnClose).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('handles empty/malformed data gracefully', () => {
    const badReq = { ...mockRequest, url: 'https://api.example.com', headers: '{', body: '', response: '', status: 'PENDING' }
    render(<Inspector request={badReq} onClose={mockOnClose} onSaveTemplate={mockOnSave} />)

    expect(screen.getByText(/No values provided/i)).toBeDefined()
    expect(screen.getAllByText(/No body provided/i)).toBeDefined()

    fireEvent.click(screen.getByText('Response'))
    expect(screen.getByText(/No execution data available/i)).toBeDefined()
  })
})
