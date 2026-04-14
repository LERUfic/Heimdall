import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const authMode = String(process.env.AUTH_MODE).replace(/["']/g, '').trim().toUpperCase()

  // Pre-warm DB in background to avoid cold start during actual login
  prisma.$connect().catch(() => {})

  // Default safely to LDAP if undefined or invalid
  const isSSO = authMode === 'SSO'

  return NextResponse.json({
    ldap: !isSSO,
    sso: isSSO
  })
}
