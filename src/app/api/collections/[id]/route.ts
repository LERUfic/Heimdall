import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = await props.params

  const collection = await prisma.requestCollection.findUnique({ where: { id: params.id } })
  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (collection.creatorId !== session.id && session.role !== 'APPROVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.requestCollection.delete({ where: { id: params.id } })

  logger.info({
    event: 'COLLECTION_DELETED',
    userId: session.id,
    username: session.username,
    metadata: { collectionId: params.id }
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = await props.params
  const p = await req.json()

  const collection = await prisma.requestCollection.findUnique({ where: { id: params.id } })
  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (collection.creatorId !== session.id && session.role !== 'APPROVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.requestCollection.update({
    where: { id: params.id },
    data: {
      name: p.name ?? collection.name,
      method: p.method ?? collection.method,
      url: p.url ?? collection.url,
      headers: p.headers !== undefined ? p.headers : collection.headers,
      body: p.body !== undefined ? p.body : collection.body,
      isGlobal: p.isGlobal !== undefined ? p.isGlobal : collection.isGlobal
    }
  })

  logger.info({
    event: 'COLLECTION_UPDATED',
    userId: session.id,
    username: session.username,
    metadata: { collectionId: params.id, changes: p }
  })

  return NextResponse.json({ collection: updated })
}
