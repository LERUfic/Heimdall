import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/collections/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Collections API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/collections', () => {
    it('should show global and personal collections to a REQUESTER', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
      prismaMock.requestCollection.findMany.mockResolvedValue([])

      const req = new Request('http://localhost/api/collections')
      await GET(req)

      expect(prismaMock.requestCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { isGlobal: true },
              { creatorId: 'user-1' }
            ]
          })
        })
      )
    })

    it('should show all collections to an APPROVER', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'boss-1', role: 'APPROVER' })
      prismaMock.requestCollection.findMany.mockResolvedValue([])

      const req = new Request('http://localhost/api/collections')
      await GET(req)

      expect(prismaMock.requestCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      )
    })
  })

  describe('POST /api/collections', () => {
    it('should create a new collection', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-1', username: 'jdoe' })
      prismaMock.requestCollection.create.mockResolvedValue({ id: 'coll-1' } as any)

      const req = new Request('http://localhost/api/collections', {
        method: 'POST',
        body: JSON.stringify({ name: 'My API', url: 'https://test.com', method: 'GET' })
      })
      const response = await POST(req)
      expect(response.status).toBe(200)
      expect(prismaMock.requestCollection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ creatorId: 'user-1', name: 'My API' })
        })
      )
    })
  })
})
