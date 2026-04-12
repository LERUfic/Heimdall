import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '@/app/api/requests/[id]/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Request Detail API (GET/PATCH /api/requests/[id])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return request if user is the owner', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'user-1' } as any)

      const req = new Request('http://localhost/api/requests/req-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'req-1' }) } as any)
      
      expect(response.status).toBe(200)
    })

    it('should return 403 if user is not the owner and not an approver', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-2', role: 'REQUESTER' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'user-1' } as any)

      const req = new Request('http://localhost/api/requests/req-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'req-1' }) } as any)
      
      expect(response.status).toBe(403)
    })
  })

  describe('PATCH', () => {
    it('should allow owner to update a PENDING request', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'user-1', status: 'PENDING' } as any)
      prismaMock.httpRequest.update.mockResolvedValue({ id: 'req-1', status: 'PENDING' } as any)

      const req = new Request('http://localhost/api/requests/req-1', {
        method: 'PATCH',
        body: JSON.stringify({ url: 'https://new-url.com' })
      })
      const response = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) } as any)
      
      expect(response.status).toBe(200)
      expect(prismaMock.httpRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ url: 'https://new-url.com' })
        })
      )
    })

    it('should prevent update if request is already APPROVED', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'user-1', status: 'APPROVED' } as any)

      const req = new Request('http://localhost/api/requests/req-1', {
        method: 'PATCH',
        body: JSON.stringify({ url: 'https://new-url.com' })
      })
      const response = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) } as any)
      
      expect(response.status).toBe(400)
    })

    it('should return 403 if user is not the owner and not an approver', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-2', role: 'REQUESTER' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'user-1', status: 'PENDING' } as any)

      const req = new Request('http://localhost/api/requests/req-1', {
        method: 'PATCH',
        body: JSON.stringify({ url: 'https://evil.com' })
      })
      const response = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) } as any)
      
      expect(response.status).toBe(403)
      expect(prismaMock.httpRequest.update).not.toHaveBeenCalled()
    })

    it('should handle database errors during update', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'user-1', status: 'PENDING' } as any)
      prismaMock.httpRequest.update.mockRejectedValue(new Error('DB Error'))

      const req = new Request('http://localhost/api/requests/req-1', {
        method: 'PATCH',
        body: JSON.stringify({ url: 'https://fail.com' })
      })
      const response = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) } as any)
      
      expect(response.status).toBe(500)
    })
  })
})
