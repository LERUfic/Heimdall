import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RequestRow from '@/components/RequestRow'

describe('RequestRow Component', () => {
  const mockUser = { id: 'u1', username: 'admin', role: 'APPROVER' }
  const mockRequest = { 
    id: 'req123-abc', 
    method: 'GET', 
    url: 'http://example.com', 
    status: 'PENDING', 
    requesterId: 'u2',
    requester: { username: 'user2' },
    createdAt: new Date().toISOString()
  }

  const mockHandlers = {
    onAction: vi.fn(),
    onClone: vi.fn(),
    onSave: vi.fn(),
    onSelect: vi.fn()
  }

  it('renders request details correctly', () => {
    render(<table><tbody><RequestRow request={mockRequest} user={mockUser} loadingAction={null} {...mockHandlers} /></tbody></table>)
    
    expect(screen.getByText('req123')).toBeDefined()
    expect(screen.getByText('GET')).toBeDefined()
    expect(screen.getByText('PENDING')).toBeDefined()
    expect(screen.getByText('user2')).toBeDefined()
  })

  it('shows Approve/Reject buttons for Approvers on others requests', () => {
    render(<table><tbody><RequestRow request={mockRequest} user={mockUser} loadingAction={null} {...mockHandlers} /></tbody></table>)
    
    expect(screen.getByText(/Approve/i)).toBeDefined()
    expect(screen.getByText(/Reject/i)).toBeDefined()
  })

  it('shows Execute button for owners on approved requests', () => {
    const approvedReq = { ...mockRequest, status: 'APPROVED', requesterId: 'u1' }
    render(<table><tbody><RequestRow request={approvedReq} user={mockUser} loadingAction={null} {...mockHandlers} /></tbody></table>)
    
    expect(screen.getByText(/Execute/i)).toBeDefined()
  })

  it('triggers onSelect when clicking the row', () => {
    render(<table><tbody><RequestRow request={mockRequest} user={mockUser} loadingAction={null} {...mockHandlers} /></tbody></table>)
    fireEvent.click(screen.getByText('req123'))
    expect(mockHandlers.onSelect).toHaveBeenCalledWith(mockRequest)
  })

  it('triggers onClone and onSave', () => {
    render(<table><tbody><RequestRow request={mockRequest} user={mockUser} loadingAction={null} {...mockHandlers} /></tbody></table>)
    fireEvent.click(screen.getByLabelText('Clone'))
    expect(mockHandlers.onClone).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Save'))
    expect(mockHandlers.onSave).toHaveBeenCalled()
  })

  it('handles HTTP code rendering', () => {
    const executedReq = { ...mockRequest, status: 'EXECUTED', response: JSON.stringify({ status: 200 }) }
    render(<table><tbody><RequestRow request={executedReq} user={mockUser} loadingAction={null} {...mockHandlers} /></tbody></table>)
    expect(screen.getByText('200')).toBeDefined()
  })

  it('renders "-" for non-executed requests', () => {
    render(<table><tbody><RequestRow request={mockRequest} user={mockUser} loadingAction={null} {...mockHandlers} /></tbody></table>)
    expect(screen.getByText('-')).toBeDefined()
  })

  it('renders "Err" for malformed response', () => {
    const badReq = { ...mockRequest, status: 'EXECUTED', response: '{' }
    render(<table><tbody><RequestRow request={badReq} user={mockUser} loadingAction={null} {...mockHandlers} /></tbody></table>)
    expect(screen.getByText('Err')).toBeDefined()
  })
})
