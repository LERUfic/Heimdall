import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { GET, PATCH } from '@/app/api/requests/[id]/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>;
}

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Requests ID API (/[id]/route.ts)', () => {
  const mockParams = { params: Promise.resolve({ id: 'req-1' }) } as RouteParams

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 404 if request not found', async () => {
      ;(getSession as Mock).mockResolvedValue({ id: 'u1' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.httpRequest.findUnique.mockResolvedValue(null as any)
      const res = await GET(new Request('http://l/1'), mockParams)
      expect(res.status).toBe(404)
    })

    it('should return 200 and request data', async () => {
      ;(getSession as Mock).mockResolvedValue({ id: 'u1' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'u1' } as any)
      const res = await GET(new Request('http://l/1'), mockParams)
      expect(res.status).toBe(200)
    })
  })

  describe('PATCH', () => {
    it('should return 403 if not owner or approver', async () => {
      ;(getSession as Mock).mockResolvedValue({ id: 'other-user', role: 'REQUESTER' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'owner-id', status: 'PENDING' } as any)
      const res = await PATCH(new Request('http://l/1', { method: 'PATCH', body: '{}' }), mockParams)
      expect(res.status).toBe(403)
    })

    it('should return 400 if not pending', async () => {
      ;(getSession as Mock).mockResolvedValue({ id: 'owner-id', role: 'REQUESTER' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.httpRequest.findUnique.mockResolvedValue({ id: 'req-1', requesterId: 'owner-id', status: 'APPROVED' } as any)
      const res = await PATCH(new Request('http://l/1', { method: 'PATCH', body: '{}' }), mockParams)
      expect(res.status).toBe(400)
    })
  })
})
