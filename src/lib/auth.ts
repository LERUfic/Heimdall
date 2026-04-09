import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_key_123')

export async function createToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch (err) {
    return null
  }
}

export async function setSessionCookie(payload: any) {
  const token = await createToken(payload)
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.FORCE_HTTPS === 'true',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
}

export async function getSession(): Promise<{ id: string; username: string; role: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  const payload = await verifyToken(token)
  return payload as any
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
