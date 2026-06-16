import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@wallet/db'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function created<T>(data: T) {
  return ok(data, 201)
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ success: false, error: message }, { status: 404 })
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status: 400 })
}

export function handleError(error: unknown) {
  console.error('[API Error]', error)

  if (error instanceof ZodError) {
    return badRequest('Validation error', error.flatten())
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return badRequest('A record with these values already exists')
    }
    if (error.code === 'P2025') {
      return notFound('Record not found')
    }
  }

  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  )
}

// Temporary: until Auth is wired (Stage 4), use a default tenant
export const DEFAULT_TENANT_ID = 'tenant_portiz'
