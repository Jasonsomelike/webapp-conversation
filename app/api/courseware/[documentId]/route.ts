import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import type { NextRequest } from 'next/server'
import { getStaticCoursewareById } from '@/lib/static-courseware'

export const runtime = 'nodejs'

const dispositionHeader = (mode: 'inline' | 'attachment', filename: string) => {
  const safe = filename.replace(/["\r\n]/g, '_')
  const asciiFallback = safe.replace(/[^\x20-\x7E]/g, '_')
  return `${mode}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safe)}`
}

const safeFilename = (value: string) =>
  (value || '知识库文档.pdf').replace(/["\r\n]/g, '_')

const rangeResponse = (
  request: NextRequest,
  filePath: string,
  fileSize: number,
  filename: string,
  disposition: 'inline' | 'attachment',
  headOnly = false,
) => {
  const range = request.headers.get('range')
  const commonHeaders = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': dispositionHeader(disposition, filename),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'X-Courseware-Source': 'vercel-static-copy',
  }

  if (range) {
    const matched = range.match(/^bytes=(\d*)-(\d*)$/)
    if (matched) {
      const start = matched[1] ? Number(matched[1]) : 0
      const end = matched[2] ? Math.min(Number(matched[2]), fileSize - 1) : fileSize - 1
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start < fileSize) {
        const body = headOnly ? null : (Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream)
        return new Response(body, {
          status: 206,
          headers: {
            ...commonHeaders,
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          },
        })
      }
    }
  }

  const body = headOnly ? null : (Readable.toWeb(createReadStream(filePath)) as ReadableStream)
  return new Response(body, {
    headers: {
      ...commonHeaders,
      'Content-Length': String(fileSize),
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params
  const courseware = getStaticCoursewareById(documentId)
  if (!courseware)
  { return new Response('Courseware file not found', { status: 404 }) }

  const filePath = path.join(process.cwd(), 'public', 'courseware', `${courseware.id}.pdf`)
  const fileStat = await stat(filePath)
  const disposition = request.nextUrl.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment'
  const filename = safeFilename(request.nextUrl.searchParams.get('filename') || courseware.name)
  return rangeResponse(request, filePath, fileStat.size, filename, disposition)
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params
  const courseware = getStaticCoursewareById(documentId)
  if (!courseware)
  { return new Response(null, { status: 404 }) }

  const filePath = path.join(process.cwd(), 'public', 'courseware', `${courseware.id}.pdf`)
  const fileStat = await stat(filePath)
  const disposition = request.nextUrl.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment'
  const filename = safeFilename(request.nextUrl.searchParams.get('filename') || courseware.name)
  return rangeResponse(request, filePath, fileStat.size, filename, disposition, true)
}
