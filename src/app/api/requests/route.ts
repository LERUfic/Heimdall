import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = session.role
  let requests = []

  const q = searchParams.get('q') || ''
  const whereClause: any = {}
  if (role !== 'APPROVER') {
    whereClause.requesterId = session.id
  }
  if (q) {
    whereClause.OR = [
      { url: { contains: q } },
      { method: { contains: q } },
      { status: { contains: q } },
      { id: { contains: q } }
    ]
  }

  requests = await prisma.httpRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { 
      requester: { select: { username: true } },
      approver: { select: { username: true } }
    }
  })

  return NextResponse.json({ requests })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { method, url, headers, body } = await req.json()

  const request = await prisma.httpRequest.create({
    data: {
      requesterId: session.id,
      method,
      url,
      headers: headers ? JSON.stringify(headers) : null,
      body: body || null,
      status: 'PENDING'
    }
  })

  logger.info({
    event: 'REQUEST_CREATED',
    userId: session.id,
    username: session.username,
    metadata: { requestId: request.id, method, targetUrl: url }
  })

  return NextResponse.json({ request })
}
