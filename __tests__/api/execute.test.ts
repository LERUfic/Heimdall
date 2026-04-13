import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { POST } from '@/app/api/requests/[id]/execute/route'
import { prismaMock } from '../__mocks__/prisma'
import { getSession } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>;
}

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Global mock for fetch
const globalFetch = vi.fn()
global.fetch = globalFetch

describe('Requests API (POST /api/requests/[id]/execute)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalFetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('{"success":true}'),
    })
  })

  it('should allow the requester to execute an APPROVED request', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
    const mockRequest = {
        id: 'req-1',
        requesterId: 'user-1',
        status: 'APPROVED',
        method: 'POST',
        url: 'https://api.test/webhook',
        headers: JSON.stringify({ 'Content-Type': 'application/json' }),
        body: '{"foo":"bar"}'
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue(mockRequest as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.update.mockResolvedValue({ ...mockRequest, status: 'EXECUTED' } as any)

    const req = new Request('http://localhost/api/requests/req-1/execute', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)

    expect(response.status).toBe(200)
    expect(globalFetch).toHaveBeenCalledWith('https://api.test/webhook', expect.objectContaining({
        method: 'POST',
        body: '{"foo":"bar"}'
    }))
    expect(prismaMock.httpRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
            data: expect.objectContaining({ status: 'EXECUTED' })
        })
    )
  })

  it('should prevent execution if not the requester', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'other-user', role: 'REQUESTER' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue({ requesterId: 'user-1', status: 'APPROVED' } as any)

    const req = new Request('http://localhost/api/requests/req-1/execute', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)

    expect(response.status).toBe(403)
  })

  it('should prevent execution if not approved', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.httpRequest.findUnique.mockResolvedValue({ requesterId: 'user-1', status: 'PENDING' } as any)

    const req = new Request('http://localhost/api/requests/req-1/execute', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)

    expect(response.status).toBe(400)
  })

  it('should handle execution failure (fetch error)', async () => {
    ;(getSession as Mock).mockResolvedValue({ id: 'user-1', role: 'REQUESTER' })
    prismaMock.httpRequest.findUnique.mockResolvedValue({
        id: 'req-1', requesterId: 'user-1', status: 'APPROVED', method: 'GET', url: 'https://broken.api'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    globalFetch.mockRejectedValue(new Error('Network failure'))

    const req = new Request('http://localhost/api/requests/req-1/execute', { method: 'POST' })
    const response = await POST(req, { params: Promise.resolve({ id: 'req-1' }) } as RouteParams)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Execution failed')
    expect(data.details).toBe('Network failure')
  })
})
