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

  try {
    const request = await prisma.httpRequest.findUnique({
      where: { id: p.id }
    })
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (request.requesterId === session.id) {
      return NextResponse.json({ error: 'You cannot approve your own request' }, { status: 403 })
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending requests can be approved' }, { status: 400 })
    }

    await prisma.httpRequest.update({
      where: { id: p.id },
      data: {
        status: 'APPROVED',
        approverId: session.id,
        approvedAt: new Date()
      }
    })

    logger.info({
      event: 'REQUEST_APPROVED',
      userId: session.id,
      username: session.username,
      metadata: { requestId: p.id }
    })

    return NextResponse.json({ request })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}
