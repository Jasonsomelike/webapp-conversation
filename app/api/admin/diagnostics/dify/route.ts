import { NextResponse } from 'next/server'
import { isAdminSession } from '@/lib/admin'
import { difyApiBaseUrl } from '@/lib/dify-server'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 60

const timeoutSignal = (milliseconds: number) => AbortSignal.timeout(milliseconds)

const tryFetch = async (url: string, init: RequestInit = {}) => {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: timeoutSignal(12_000),
    })
    const text = await response.text().catch(() => '')
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      elapsedMs: Date.now() - started,
      bodyHead: text.slice(0, 160),
    }
  }
  catch (error) {
    const cause = (error as { cause?: unknown })?.cause
    return {
      ok: false,
      status: 0,
      elapsedMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      cause: cause instanceof Error ? cause.message : cause ? String(cause) : undefined,
    }
  }
}

export async function GET() {
  const session = await getSession()
  if (!session || !isAdminSession(session))
  { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const relayBase = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '') || ''
  const relayHealth = relayBase ? await tryFetch(`${relayBase}/health`) : null
  const difyParameters = await tryFetch(`${difyApiBaseUrl}/parameters`, {
    headers: process.env.DIFY_API_KEY
      ? { Authorization: `Bearer ${process.env.DIFY_API_KEY}` }
      : undefined,
  })

  return NextResponse.json({
    configured: {
      difyApiBaseUrl,
      hasDifyApiKey: Boolean(process.env.DIFY_API_KEY),
      hasRelayUrl: Boolean(relayBase),
      relayHost: relayBase ? new URL(relayBase).host : '',
      relayPath: relayBase ? new URL(relayBase).pathname : '',
      hasRelayToken: Boolean(process.env.LIBRARY_FILE_SERVICE_TOKEN),
    },
    checks: {
      relayHealth,
      difyParameters,
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
