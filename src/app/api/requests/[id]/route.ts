import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/requests/[id] - Fetch a single request
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.httpRequest.findUnique({
    where: { id: p.id },
    include: {
      requester: { select: { username: true } },
      approver: { select: { username: true } }
    }
  })

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Security: Requesters can only see their own. Approvers see all.
  if (session.role !== 'APPROVER' && request.requesterId !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ request })
}

// PATCH /api/requests/[id] - Update a pending request
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.httpRequest.findUnique({ where: { id: p.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 1. Only PENDING requests can be edited
  if (request.status !== 'PENDING') {
    return NextResponse.json({ error: 'Only pending requests can be modified' }, { status: 400 })
  }

  // 2. Permission check: Requester (owner) or Approver
  if (session.id !== request.requesterId && session.role !== 'APPROVER') {
    return NextResponse.json({ error: 'You do not have permission to edit this request' }, { status: 403 })
  }

  const { method, url, headers, body } = await req.json()

  try {
    const updatedRequest = await prisma.httpRequest.update({
      where: { id: p.id },
      data: {
        method: method || request.method,
        url: url || request.url,
        headers: headers ? JSON.stringify(headers) : (headers === null ? null : request.headers),
        body: body === undefined ? request.body : body
      }
    })

    logger.info({
      event: 'REQUEST_UPDATED',
      userId: session.id,
      username: session.username,
      metadata: {
        requestId: p.id,
        oldMethod: request.method,
        newMethod: method,
        oldUrl: request.url,
        newUrl: url
      }
    })

    return NextResponse.json({ request: updatedRequest })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: 'Update failed', details: message }, { status: 500 })
  }
}
