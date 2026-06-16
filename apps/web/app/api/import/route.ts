import { NextRequest } from 'next/server'
import { ok, badRequest, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

// Full import logic lives in packages/scripts/import.ts
// This endpoint triggers it via HTTP (useful for future admin UI)

export async function GET() {
  return ok({ message: 'POST a JSON body with { batchId } to check status, or use the CLI importer.' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    if (!body.filename) {
      return badRequest('filename is required. Use the CLI: yarn workspace @wallet/scripts import --file data/wallet_records_2026.csv')
    }

    // For now, just acknowledge — actual import runs via CLI script
    return ok({
      message: 'Import queued. Run via CLI for full processing.',
      tenantId: DEFAULT_TENANT_ID,
    })
  } catch (e) {
    return handleError(e)
  }
}
