import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const collections = await prisma.requestCollection.findMany({
    where: {
      OR: [
        { isGlobal: true },
        { creatorId: session.id }
      ]
    },
    include: {
      creator: {
        select: { username: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ collections })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const p = await req.json()
    
    const newCollection = await prisma.requestCollection.create({
      data: {
        name: p.name,
        method: p.method,
        url: p.url,
        headers: p.headers,
        body: p.body,
        isGlobal: p.isGlobal || false,
        creatorId: session.id
      }
    })

    logger.info({
      event: 'COLLECTION_CREATED',
      userId: session.id,
      username: session.username,
      metadata: { collectionId: newCollection.id, name: p.name, isGlobal: p.isGlobal }
    })

    return NextResponse.json({ collection: newCollection })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save collection', details: err.message }, { status: 500 })
  }
}
