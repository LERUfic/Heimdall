import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TemplateModal from '@/components/TemplateModal'

describe('TemplateModal Component', () => {
  const mockRequest = { id: 'req-1', method: 'GET', url: 'http://e.com' }
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<TemplateModal request={mockRequest} onClose={mockOnClose} onSave={mockOnSave} />)
    expect(screen.getByText(/Save as Blueprint/i)).toBeDefined()
  })

  it('validates input before saving', async () => {
    render(<TemplateModal request={mockRequest} onClose={mockOnClose} onSave={mockOnSave} />)
    const saveBtn = screen.getByText('Confirm Save')
    
    expect(saveBtn.hasAttribute('disabled')).toBe(true)
    
    fireEvent.change(screen.getByPlaceholderText(/Production Cache Purge/i), { target: { value: 'My Template' } })
    expect(saveBtn.hasAttribute('disabled')).toBe(false)
    
    await act(async () => {
      fireEvent.click(saveBtn)
    })
    
    expect(mockOnSave).toHaveBeenCalledWith('My Template', false)
  })

  it('handles global toggle', async () => {
    render(<TemplateModal request={mockRequest} onClose={mockOnClose} onSave={mockOnSave} />)
    
    fireEvent.change(screen.getByPlaceholderText(/Production Cache Purge/i), { target: { value: 'Global Template' } })
    fireEvent.click(screen.getByRole('checkbox'))
    
    await act(async () => {
      fireEvent.click(screen.getByText('Confirm Save'))
    })
    
    expect(mockOnSave).toHaveBeenCalledWith('Global Template', true)
  })

  it('closes on cancel', () => {
    render(<TemplateModal request={mockRequest} onClose={mockOnClose} onSave={mockOnSave} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })
})
