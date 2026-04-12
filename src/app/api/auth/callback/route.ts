import { NextResponse } from 'next/server'
import { decodeJwt } from 'jose'
import { prisma } from '@/lib/prisma'
import { setSessionCookie } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    
    if (error) throw new Error(`IdP returned error: ${error}`)
    if (!code) throw new Error("Missing authorization code from Identity Provider")

    const clientId = process.env.OAUTH_CLIENT_ID
    const clientSecret = process.env.OAUTH_CLIENT_SECRET
    const tokenUrl = process.env.OAUTH_TOKEN_URL
    const redirectUri = process.env.OAUTH_REDIRECT_URI

    if (!clientId || !clientSecret || !tokenUrl || !redirectUri) {
      throw new Error("Critical OIDC parameters missing in .env")
    }

    // 1. Physically exchange the abstract `code` for the strict OIDC Tokens via back-channel TLS
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text()
      throw new Error(`Failed token exchange HTTP ${tokenResponse.status}: ${errBody}`)
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData.id_token) {
      throw new Error("Identity Provider did not return a valid id_token payload")
    }

    // 2. Decode the structured JWT (we trust the payload since it was securely fetched over TLS via client_secret)
    const idpPayload = decodeJwt(tokenData.id_token)
    
    // Standard maps: Google/Keycloak usually output `email`, occasionally `preferred_username`
    const remoteUserIdentifier = (idpPayload.email || idpPayload.preferred_username || idpPayload.sub) as string
    
    if (!remoteUserIdentifier) {
      throw new Error("Could not resolve an email or username identifier from the IdP payload")
    }

    // 3. Map to Internal SQLite Role Boundaries
    const approvers = (process.env.APPROVERS || 'admin').split(',').map(s => s.trim().toLowerCase())
    
    // For SSO, we often rely on exact email string matching against the APPROVERS mapping:
    const role = approvers.includes(remoteUserIdentifier.toLowerCase()) ? 'APPROVER' : 'REQUESTER'
    
    const user = await prisma.user.upsert({
      where: { username: remoteUserIdentifier.toLowerCase() },
      update: { role },
      create: { username: remoteUserIdentifier.toLowerCase(), role }
    })

    // 4. Issue the local execution JWT
    await setSessionCookie({ id: user.id, username: user.username, role: user.role })
    
    logger.info({
      event: 'USER_LOGIN_SUCCESS',
      userId: user.id,
      username: user.username,
      metadata: { role: user.role, provider: 'OIDC_SSO' }
    })

    return NextResponse.redirect(new URL('/', req.url))

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ event: 'SSO_CALLBACK_ERROR', error: message })
    return NextResponse.redirect(new URL('/login?error=sso_callback_failed', req.url))
  }
}
