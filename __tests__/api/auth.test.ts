import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { POST } from '@/app/api/auth/login/route'
import { prismaMock } from '../__mocks__/prisma'
import { setSessionCookie } from '@/lib/auth'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  setSessionCookie: vi.fn(),
}))

vi.mock('ldap-authentication', () => ({
  authenticate: vi.fn(),
}))

describe('Auth API (POST /api/auth/login)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MOCK_LDAP = 'true'
    process.env.APPROVERS = 'admin,boss'
  })

  it('should authenticate a user and assign REQUESTER role by default', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'jdoe', password: 'password' }),
    })

    prismaMock.user.upsert.mockResolvedValue({
      id: 'uuid-123',
      username: 'jdoe',
      role: 'REQUESTER',
      createdAt: new Date(),
      updatedAt: new Date(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.role).toBe('REQUESTER')
    expect(setSessionCookie).toHaveBeenCalled()
  })

  it('should assign APPROVER role if username is in the APPROVERS list', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' }),
    })

    prismaMock.user.upsert.mockResolvedValue({
      id: 'uuid-admin',
      username: 'admin',
      role: 'APPROVER',
      createdAt: new Date(),
      updatedAt: new Date(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const response = await POST(req)
    const data = await response.json()

    expect(data.user.role).toBe('APPROVER')
    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: 'APPROVER' }),
      })
    )
  })

  it('should return 401 for invalid credentials in mock mode', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'jdoe', password: 'wrong-password' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should support real LDAP authentication success', async () => {
    process.env.MOCK_LDAP = 'false'
    process.env.LDAP_URL = 'ldap://test'
    const { authenticate } = await import('ldap-authentication')
    ;(authenticate as Mock).mockResolvedValue({ sAMAccountName: 'jdoe' })

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'jdoe', password: 'secret-password' }),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.user.upsert.mockResolvedValue({ id: '1', username: 'jdoe', role: 'REQUESTER' } as any)

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(authenticate).toHaveBeenCalled()
  })

  it('should handle real LDAP authentication failure', async () => {
    process.env.MOCK_LDAP = 'false'
    process.env.LDAP_URL = 'ldap://test'
    const { authenticate } = await import('ldap-authentication')
    ;(authenticate as Mock).mockRejectedValue(new Error('LDAP Connection Failed'))

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'jdoe', password: 'any-password' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid credentials')
  })

  it('should handle Active Directory style search bind', async () => {
    process.env.MOCK_LDAP = 'false'
    process.env.LDAP_URL = 'ldap://test'
    process.env.LDAP_BIND_DN = 'cn=admin'
    process.env.LDAP_BIND_PASSWORD = 'password'
    process.env.LDAP_SEARCH_FILTER = '(uid={{username}})'

    const { authenticate } = await import('ldap-authentication')
    ;(authenticate as Mock).mockResolvedValue({ sAMAccountName: 'jdoe' })

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'jdoe', password: 'secret-password' }),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.user.upsert.mockResolvedValue({ id: '1', username: 'jdoe', role: 'REQUESTER' } as any)

    const response = await POST(req)
    await response.json()

    expect(response.status).toBe(200)
    expect(authenticate).toHaveBeenCalledWith(expect.objectContaining({
      adminDn: 'cn=admin',
      userSearchFilter: '(uid=jdoe)'
    }))
  })

  it('should fallback to default admin approver if APPROVERS env is missing', async () => {
    delete process.env.APPROVERS
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' }),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.user.upsert.mockResolvedValue({ id: '1', username: 'admin', role: 'APPROVER' } as any)
    const response = await POST(req)
    const data = await response.json()
    expect(data.user.role).toBe('APPROVER')
  })

  it('should handle missing LDAP_SEARCH_FILTER', async () => {
    process.env.MOCK_LDAP = 'false'
    process.env.LDAP_URL = 'ldap://test'
    process.env.LDAP_BIND_DN = 'cn=admin'
    delete process.env.LDAP_SEARCH_FILTER

    const { authenticate } = await import('ldap-authentication')
    ;(authenticate as Mock).mockResolvedValue({ cn: 'jdoe' })

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'jdoe', password: 'p' }),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.user.upsert.mockResolvedValue({ id: '1', username: 'jdoe', role: 'REQUESTER' } as any)
    await POST(req)

    expect(authenticate).toHaveBeenCalledWith(expect.not.objectContaining({
      userSearchFilter: expect.anything()
    }))
  })
})
