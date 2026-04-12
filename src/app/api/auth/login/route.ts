import { NextResponse } from 'next/server'
import { authenticate } from 'ldap-authentication'
import { prisma } from '@/lib/prisma'
import { setSessionCookie } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  const isMock = String(process.env.MOCK_LDAP).replace(/["']/g, '').trim().toLowerCase() === 'true' || !process.env.LDAP_URL

  let success = false;
  if (isMock) {
    if (password === 'password') {
      success = true;
    }
  } else {
    try {
      const options: Record<string, unknown> = {
        ldapOpts: { url: process.env.LDAP_URL || '' },
        userPassword: password
      }

      if (process.env.LDAP_BIND_DN && process.env.LDAP_BIND_PASSWORD) {
        // Admin Search Bind (Active Directory Style)
        options.adminDn = process.env.LDAP_BIND_DN
        options.adminPassword = process.env.LDAP_BIND_PASSWORD
        options.userSearchBase = process.env.LDAP_SEARCH_BASE_DNS || process.env.LDAP_SEARCH_BASE || ''
        options.username = username
        options.usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || 'uid'

        if (process.env.LDAP_SEARCH_FILTER) {
          let filter = process.env.LDAP_SEARCH_FILTER
          filter = filter.replace(/\{\{username\}\}/g, username).replace(/%s/g, username)
          options.userSearchFilter = filter
        }
      } else {
        // Simple Bind logic
        options.userDn = `${process.env.LDAP_USER_PREFIX || ''}${username}${process.env.LDAP_USER_SUFFIX || ''}`
        options.userSearchBase = process.env.LDAP_SEARCH_BASE || ''
        options.usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || 'cn'
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await authenticate(options as any)
      if (user) success = true
    } catch (err) {
      logger.error({ event: 'LDAP_AUTH_ERROR', username, error: err })
    }
  }

  if (success) {
    const approvers = (process.env.APPROVERS || 'admin').split(',').map(s => s.trim().toLowerCase())
    const role = approvers.includes(username.toLowerCase()) ? 'APPROVER' : 'REQUESTER'
    const user = await prisma.user.upsert({
      where: { username },
      update: { role },
      create: { username, role }
    })
    await setSessionCookie({ id: user.id, username: user.username, role: user.role })
    
    logger.info({
      event: 'USER_LOGIN_SUCCESS',
      userId: user.id,
      username: user.username,
      metadata: { role: user.role, isMock }
    })
    
    return NextResponse.json({ success: true, user })
  }

  logger.warn({ event: 'USER_LOGIN_FAILED', username, metadata: { isMock } })
  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
}
