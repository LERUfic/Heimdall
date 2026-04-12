import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/requests/[id]/approve/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

// Mock session
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Requests API (POST /api/requests/[id]/approve)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow an APPROVER to approve a request', async () => {
    // 1. Mock Session: Current user is an Approver
    ;(getSession as any).mockResolvedValue({ id: 'approver-id', username: 'boss', role: 'APPROVER' })

    // 2. Mock DB: The request was made by someone else
    const mockRequest = { id: 'req-1', requesterId: 'requester-id', status: 'PENDING' }
    prismaMock.httpRequest.findUnique.mockResolvedValue(mockRequest as any)
    prismaMock.httpRequest.update.mockResolvedValue({ ...mockRequest, status: 'APPROVED' } as any)

    const req = new Request('http://localhost/api/requests/req-1/approve', {
      method: 'POST',
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.httpRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED', approverId: 'approver-id' }),
      })
    )
  })

  it('should prevent a requester from approving their own request', async () => {
    // 1. Mock Session: Current user is the Requester (even if they have APPROVER role)
    ;(getSession as any).mockResolvedValue({ id: 'my-id', username: 'jdoe', role: 'APPROVER' })

    // 2. Mock DB: Request id match session id
    const mockRequest = { id: 'req-1', requesterId: 'my-id', status: 'PENDING' }
    prismaMock.httpRequest.findUnique.mockResolvedValue(mockRequest as any)

    const req = new Request('http://localhost/api/requests/req-1/approve', {
      method: 'POST',
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('cannot approve your own request')
  })

  it('should return 401 if user is not an APPROVER', async () => {
    ;(getSession as any).mockResolvedValue({ id: 'user-id', username: 'jdoe', role: 'REQUESTER' })

    const req = new Request('http://localhost/api/requests/req-1/approve', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as any)

    expect(response.status).toBe(401)
  })

  it('should return 404 if request is not found', async () => {
    ;(getSession as any).mockResolvedValue({ id: 'boss-id', username: 'boss', role: 'APPROVER' })
    prismaMock.httpRequest.findUnique.mockResolvedValue(null)

    const req = new Request('http://localhost/api/requests/none/approve', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'none' }) } as any)

    expect(response.status).toBe(404)
  })

  it('should return 400 if request is already processed', async () => {
    ;(getSession as any).mockResolvedValue({ id: 'boss-id', role: 'APPROVER' })
    prismaMock.httpRequest.findUnique.mockResolvedValue({ status: 'APPROVED' } as any)

    const req = new Request('http://localhost/api/requests/req-1/approve', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as any)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Only pending requests can be approved')
  })
})
