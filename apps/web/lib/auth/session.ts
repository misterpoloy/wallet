// Session cookie using HMAC-SHA256 via crypto.subtle (Edge + Node 18+ compatible)

const COOKIE_NAME = 'wallet_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export interface SessionPayload {
  userId: string
  tenantId: string
  role: string
  email: string
  exp: number
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.WALLET_SESSION_SECRET ?? 'dev-secret-change-in-production-min32chars!!'
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function createSessionToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const data: SessionPayload = { ...payload, exp: Date.now() + MAX_AGE * 1000 }
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url')
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded))
  const sigB64 = Buffer.from(sig).toString('base64url')
  return `${encoded}.${sigB64}`
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const dotIdx = token.lastIndexOf('.')
    if (dotIdx === -1) return null
    const encoded = token.slice(0, dotIdx)
    const sigB64 = token.slice(dotIdx + 1)
    const key = await getKey()
    const sig = Buffer.from(sigB64, 'base64url')
    const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(encoded))
    if (!valid) return null
    const payload: SessionPayload = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export { COOKIE_NAME, MAX_AGE }
