import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { GET, POST } from '@/app/api/requests/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('Requests API (Basic)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/requests', () => {
    it('should return 401 if not authenticated', async () => {
      ;(getSession as Mock).mockResolvedValue(null)
      const req = new Request('http://localhost/api/requests')
      const response = await GET(req)
      expect(response.status).toBe(401)
    })

    it('should list only user requests for a REQUESTER', async () => {
      ;(getSession as Mock).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
      prismaMock.httpRequest.findMany.mockResolvedValue([])

      const req = new Request('http://localhost/api/requests')
      await GET(req)

      expect(prismaMock.httpRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requesterId: 'user-1' })
        })
      )
    })

    it('should list all requests for an APPROVER', async () => {
      ;(getSession as Mock).mockResolvedValue({ id: 'boss-1', role: 'APPROVER' })
      prismaMock.httpRequest.findMany.mockResolvedValue([])

      const req = new Request('http://localhost/api/requests')
      await GET(req)

      expect(prismaMock.httpRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ requesterId: 'boss-1' })
        })
      )
    })

    it('should apply search filters when "q" is provided', async () => {
      ;(getSession as Mock).mockResolvedValue({ id: 'user-1', role: 'APPROVER' })
      prismaMock.httpRequest.findMany.mockResolvedValue([])

      const req = new Request('http://localhost/api/requests?q=target-url')
      await GET(req)

      expect(prismaMock.httpRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ url: expect.objectContaining({ contains: 'target-url' }) })
            ])
          })
        })
      )
    })
  })

  describe('POST /api/requests', () => {
    it('should create a new pending request', async () => {
      ;(getSession as Mock).mockResolvedValue({ id: 'user-1', username: 'jdoe' })
      const mockRequest = { id: 'new-id', status: 'PENDING' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.httpRequest.create.mockResolvedValue(mockRequest as any)

      const req = new Request('http://localhost/api/requests', {
        method: 'POST',
        body: JSON.stringify({ method: 'GET', url: 'https://api.com' })
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.request.status).toBe('PENDING')
      expect(prismaMock.httpRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ requesterId: 'user-1', method: 'GET' })
        })
      )
    })
  })
})
