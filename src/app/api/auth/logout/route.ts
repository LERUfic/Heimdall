import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function POST() {
  await clearSession()
  logger.info({ event: 'USER_LOGOUT' })
  return NextResponse.json({ success: true })
}
