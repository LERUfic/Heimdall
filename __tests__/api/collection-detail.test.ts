import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE, PATCH } from '@/app/api/collections/[id]/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Collection Detail API (DELETE/PATCH /api/collections/[id])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DELETE', () => {
    it('should allow owner to delete a collection', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
      prismaMock.requestCollection.findUnique.mockResolvedValue({ id: 'coll-1', creatorId: 'user-1' } as any)

      const req = new Request('http://localhost/api/collections/coll-1', { method: 'DELETE' })
      const response = await DELETE(req, { params: Promise.resolve({ id: 'coll-1' }) } as any)
      
      expect(response.status).toBe(200)
      expect(prismaMock.requestCollection.delete).toHaveBeenCalled()
    })

    it('should refuse deletion if user is not the owner', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-2', role: 'REQUESTER' })
      prismaMock.requestCollection.findUnique.mockResolvedValue({ id: 'coll-1', creatorId: 'user-1' } as any)

      const req = new Request('http://localhost/api/collections/coll-1', { method: 'DELETE' })
      const response = await DELETE(req, { params: Promise.resolve({ id: 'coll-1' }) } as any)
      
      expect(response.status).toBe(403)
    })
  })

  describe('PATCH', () => {
    it('should allow owner to update a collection', async () => {
      ;(getSession as any).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
      prismaMock.requestCollection.findUnique.mockResolvedValue({ id: 'coll-1', creatorId: 'user-1' } as any)
      prismaMock.requestCollection.update.mockResolvedValue({ id: 'coll-1' } as any)

      const req = new Request('http://localhost/api/collections/coll-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' })
      })
      const response = await PATCH(req, { params: Promise.resolve({ id: 'coll-1' }) } as any)
      
      expect(response.status).toBe(200)
      expect(prismaMock.requestCollection.update).toHaveBeenCalled()
    })
  })
})
