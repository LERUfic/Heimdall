import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { POST } from '@/app/api/requests/[id]/approve/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>;
}

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Request Approval API (POST /api/requests/[id]/approve)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow an approver to approve a PENDING request', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'approver-id', username: 'boss', role: 'APPROVER' })

    const mockRequest = { id: 'req-1', requesterId: 'user-1', status: 'PENDING' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue(mockRequest as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.update.mockResolvedValue({ ...mockRequest, status: 'APPROVED' } as any)

    const req = new Request('http://localhost/api/requests/req-1/approve', {
      method: 'POST',
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)
    await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.httpRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED', approverId: 'approver-id' }),
      })
    )
  })

  it('should prevent a requester from approving their own request', async () => {
    // 1. Mock Session: Current user is the Requester (even if they have APPROVER role)
    ;(getSession as Mock).mockResolvedValue({ id: 'my-id', username: 'jdoe', role: 'APPROVER' })

    // 2. Mock DB: Request id match session id
    const mockRequest = { id: 'req-1', requesterId: 'my-id', status: 'PENDING' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue(mockRequest as any)

    const req = new Request('http://localhost/api/requests/req-1/approve', {
      method: 'POST',
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('cannot approve your own request')
  })

  it('should return 401 if user is not an APPROVER', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'user-id', username: 'jdoe', role: 'REQUESTER' })

    const req = new Request('http://localhost/api/requests/req-1/approve', {
      method: 'POST',
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)
    expect(response.status).toBe(401) // Correctly matches the route handler's unauthorized response
  })

  it('should handle request not found', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'approver-id', role: 'APPROVER' })
    prismaMock.httpRequest.findUnique.mockResolvedValue(null)

    const req = new Request('http://localhost/api/requests/ghost-1/approve', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'ghost-1' }) } as RouteParams)

    expect(response.status).toBe(404)
  })

  it('should handle database errors during approval', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'approver-id', role: 'APPROVER' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', status: 'PENDING', requesterId: 'u1' } as any)
    prismaMock.httpRequest.update.mockRejectedValue(new Error('DB Error'))

    const req = new Request('http://localhost/api/requests/req-1/approve', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)

    expect(response.status).toBe(500)
  })
})
