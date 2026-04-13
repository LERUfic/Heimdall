import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { POST } from '@/app/api/requests/[id]/reject/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>;
}

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Requests API (POST /api/requests/[id]/reject)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow an APPROVER to reject a request', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'approver-id', role: 'APPROVER' })
    const mockRequest = { id: 'req-1', requesterId: 'user-id', status: 'PENDING' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue(mockRequest as any)

    const req = new Request('http://localhost/api/requests/req-1/reject', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)

    expect(response.status).toBe(200)
    expect(prismaMock.httpRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED' }),
      })
    )
  })

  it('should return 400 if request is already processed', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'approver-id', role: 'APPROVER' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue({ status: 'APPROVED' } as any)

    const req = new Request('http://localhost/api/requests/req-1/reject', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)

    expect(response.status).toBe(400)
  })

  it('should return 401 if user is not an APPROVER', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'user-id', role: 'REQUESTER' })
    const req = new Request('http://localhost/api/requests/req-1/reject', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)
    expect(response.status).toBe(401)
  })

  it('should return 404 if request is not found', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'boss-id', role: 'APPROVER' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue(null as any)
    const req = new Request('http://localhost/api/requests/none/reject', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'none' }) } as RouteParams)
    expect(response.status).toBe(404)
  })

  it('should prevent self-rejection', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'my-id', role: 'APPROVER' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue({ requesterId: 'my-id', status: 'PENDING' } as any)
    const req = new Request('http://localhost/api/requests/req-1/reject', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)
    expect(response.status).toBe(403)
  })
})
