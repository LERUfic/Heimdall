import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    const clientId = process.env.OAUTH_CLIENT_ID
    const authUrl = process.env.OAUTH_AUTH_URL
    const redirectUri = process.env.OAUTH_REDIRECT_URI

    if (!clientId || !authUrl || !redirectUri) {
      throw new Error("OIDC environment parameters are critically missing from .env block")
    }

    const url = new URL(authUrl)
    // Crucial OpenID Connect standard traversal payload
    url.searchParams.append('client_id', clientId)
    url.searchParams.append('redirect_uri', redirectUri)
    url.searchParams.append('response_type', 'code')
    url.searchParams.append('scope', 'openid email profile')
    // (Optional) State / Nonce mapping if strict PKCE is demanded by the enterprise IT later

    logger.info({
      event: 'SSO_REDIRECT_INITIATED',
      metadata: { target_idp: authUrl }
    })

    return NextResponse.redirect(url.toString())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ event: 'SSO_AUTH_ERROR', error: message })
    return NextResponse.redirect(new URL('/login?error=sso_failed_config', req.url))
  }
}
