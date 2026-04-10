import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const session = await getSession()
  if (!session || session.role !== 'APPROVER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const request = await prisma.httpRequest.findUnique({
    where: { id: p.id }
  })
  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  if (request.requesterId === session.id) {
    return NextResponse.json({ error: 'You cannot reject your own request' }, { status: 403 })
  }

  await prisma.httpRequest.update({
    where: { id: p.id },
    data: {
      status: 'REJECTED',
      approverId: session.id,
      rejectedAt: new Date()
    }
  })

  logger.info({
    event: 'REQUEST_REJECTED',
    userId: session.id,
    username: session.username,
    metadata: { requestId: p.id }
  })

  return NextResponse.json({ request })
}
