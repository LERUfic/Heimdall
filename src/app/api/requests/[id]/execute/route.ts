import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.httpRequest.findUnique({ where: { id: p.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status !== 'APPROVED') return NextResponse.json({ error: 'Request not approved' }, { status: 400 })
  if (request.requesterId !== session.id) return NextResponse.json({ error: 'Only requester can execute' }, { status: 403 })

  try {
    let parsedHeaders = request.headers ? JSON.parse(request.headers) : {}
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: parsedHeaders,
    }
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
      fetchOptions.body = request.body
    }

    const response = await fetch(request.url, fetchOptions)
    const respText = await response.text()
    
    // Assume we store part of response body or headers safely, truncated if needed
    const responseData = JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      body: respText.slice(0, 50000) // limit size to 50KB 
    })

    const updatedRequest = await prisma.httpRequest.update({
      where: { id: p.id },
      data: {
        status: 'EXECUTED',
        response: responseData,
        executedAt: new Date()
      }
    })

    return NextResponse.json({ request: updatedRequest })
  } catch (err: any) {
    return NextResponse.json({ error: 'Execution failed', details: err.message }, { status: 500 })
  }
}
