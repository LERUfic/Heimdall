import { NextResponse } from 'next/server'

export async function GET() {
  const authMode = String(process.env.AUTH_MODE).replace(/["']/g, '').trim().toUpperCase()

  // Default safely to LDAP if undefined or invalid
  const isSSO = authMode === 'SSO'

  return NextResponse.json({
    ldap: !isSSO,
    sso: isSSO
  })
}
