import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const session = await getSession()
  if (!session || session.role !== 'APPROVER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const request = await prisma.httpRequest.update({
    where: { id: p.id },
    data: {
      status: 'REJECTED',
      approverId: session.id
    }
  })

  return NextResponse.json({ request })
}
