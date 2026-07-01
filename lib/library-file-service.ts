import 'server-only'

import { createHmac, randomUUID } from 'node:crypto'

const libraryFileServiceBaseUrl = () => process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '') || ''

export const signedLibraryDocumentFileUrl = ({
  documentId,
  disposition,
  filename,
  page,
  expiresInSeconds = 540,
}: {
  documentId: string
  disposition: 'inline' | 'attachment'
  filename: string
  page?: number
  expiresInSeconds?: number
}) => {
  const baseUrl = libraryFileServiceBaseUrl()
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!baseUrl || !token || !documentId)
  { return '' }

  const requestId = randomUUID()
  const expires = String(Math.floor(Date.now() / 1000) + Math.min(540, Math.max(60, expiresInSeconds)))
  const canonical = `${documentId}\n${disposition}\n${filename}\n${requestId}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}/library/documents/${encodeURIComponent(documentId)}/file`)
  url.searchParams.set('disposition', disposition)
  url.searchParams.set('filename', filename)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)
  if (page && disposition === 'inline')
  { url.hash = `page=${page}` }
  return url.toString()
}
