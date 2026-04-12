import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '@/app/api/requests/[id]/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Requests ID API (/[id]/route.ts)', () => {
  const mockParams = { params: Promise.resolve({ id: 'req-1' }) }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 404 if request not found', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'u1' })
      prismaMock.httpRequest.findUnique.mockResolvedValue(null)
      const res = await GET(new Request('http://l/1'), mockParams as any)
      expect(res.status).toBe(404)
    })
    
    it('should return 200 and request data', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'u1' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'u1' } as any)
      const res = await GET(new Request('http://l/1'), mockParams as any)
      expect(res.status).toBe(200)
    })
  })

  describe('PATCH', () => {
    it('should return 403 if not owner or approver', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'other-user', role: 'REQUESTER' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'owner-id', status: 'PENDING' } as any)
      const res = await PATCH(new Request('http://l/1', { method: 'PATCH', body: '{}' }), mockParams as any)
      expect(res.status).toBe(403)
    })

    it('should return 400 if not pending', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'owner-id', role: 'REQUESTER' })
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'owner-id', status: 'APPROVED' } as any)
      const res = await PATCH(new Request('http://l/1', { method: 'PATCH', body: '{}' }), mockParams as any)
      expect(res.status).toBe(400)
    })
  })
})
