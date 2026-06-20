import 'server-only'

import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import mammoth from 'mammoth'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'

const supportedExtensions = new Set(['pdf', 'docx', 'txt', 'md', 'markdown', 'csv'])
const maxExtractedCharacters = 180_000
const localUploadPrefix = 'localdoc_'

const cleanExtractedText = (value: string) => value
  .split('\u0000')
  .join('')
  .replace(/\r\n?/g, '\n')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{4,}/g, '\n\n\n')
  .trim()
  .slice(0, maxExtractedCharacters)

const decodePlainText = (buffer: Buffer) => {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const replacementRatio = (utf8.match(/\uFFFD/g)?.length || 0) / Math.max(utf8.length, 1)
  if (replacementRatio < 0.01)
  { return utf8 }
  try {
    return new TextDecoder('gb18030', { fatal: false }).decode(buffer)
  }
  catch {
    return utf8
  }
}

export const parsedUploadExtension = (filename: string) =>
  filename.split('.').pop()?.toLowerCase() || ''

export const isParsedUploadSupported = (filename: string) =>
  supportedExtensions.has(parsedUploadExtension(filename))

export const isLocalParsedUploadId = (value?: string | null) =>
  Boolean(value?.startsWith(localUploadPrefix))

export const localParsedUploadDatabaseId = (value: string) =>
  value.slice(localUploadPrefix.length)

export const extractUploadedDocumentText = async (file: File) => {
  const extension = parsedUploadExtension(file.name)
  if (!supportedExtensions.has(extension))
  { throw new Error('UNSUPPORTED_DOCUMENT_TYPE') }

  const buffer = Buffer.from(await file.arrayBuffer())
  let extracted = ''
  if (extension === 'pdf') {
    const canvas = await import('@napi-rs/canvas')
    const runtime = globalThis as unknown as Record<string, unknown>
    runtime.DOMMatrix ||= canvas.DOMMatrix
    runtime.ImageData ||= canvas.ImageData
    runtime.Path2D ||= canvas.Path2D
    const { PDFParse } = await import('pdf-parse')
    const workerPath = join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
    PDFParse.setWorker(pathToFileURL(workerPath).href)
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText({ first: 500 })
      extracted = result.text || ''
    }
    finally {
      await parser.destroy()
    }
  }
  else if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    extracted = result.value || ''
  }
  else {
    extracted = decodePlainText(buffer)
  }

  const text = cleanExtractedText(extracted)
  if (!text)
  { throw new Error('DOCUMENT_TEXT_EMPTY') }
  return { extension, text }
}

export const saveParsedUpload = async ({
  appUserId,
  file,
}: {
  appUserId: string
  file: File
}) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }
  const { extension, text } = await extractUploadedDocumentText(file)
  const upload = await withDatabaseRetry(() => db.parsedUpload.create({
    data: {
      appUserId,
      filename: file.name.slice(0, 255),
      mimeType: (file.type || 'application/octet-stream').slice(0, 128),
      extension,
      size: file.size,
      extractedText: text,
    },
    select: { id: true },
  }))
  void db.parsedUpload.deleteMany({
    where: {
      appUserId,
      createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  }).catch(() => {})
  return `${localUploadPrefix}${upload.id}`
}

export const getParsedUploadContext = async (appUserId: string, uploadIds: string[]) => {
  const ids = [...new Set(uploadIds)]
    .filter(isLocalParsedUploadId)
    .map(localParsedUploadDatabaseId)
    .filter(Boolean)
    .slice(0, 5)
  if (!ids.length || !isDatabaseConfigured())
  { return '' }

  const uploads = await withDatabaseRetry(() => db.parsedUpload.findMany({
    where: { appUserId, id: { in: ids } },
    orderBy: { createdAt: 'asc' },
    select: { filename: true, extension: true, extractedText: true },
  }))
  let remaining = 120_000
  const sections: string[] = []
  for (const upload of uploads) {
    if (remaining <= 0)
    { break }
    const text = upload.extractedText.slice(0, remaining)
    if (!text)
    { continue }
    remaining -= text.length
    sections.push(`【用户上传文件：${upload.filename}（${upload.extension.toUpperCase()}）】\n${text}`)
  }
  return sections.join('\n\n────────────────────\n\n')
}
