import 'server-only'

import { PDFDocument } from 'pdf-lib'
import type { KnowledgeDocumentPageImage } from '@/lib/dify-dataset'

const imageHost = 'dify.jasonsome.cn'

const fetchPageImage = async (url: string) => {
  const parsed = new URL(url)
  const allowed = parsed.protocol === 'https:'
    && parsed.hostname === imageHost
    && (!parsed.port || parsed.port === '22380')
    && parsed.pathname.startsWith('/page-images/')
  if (!allowed)
  { throw new Error('FORBIDDEN_PAGE_IMAGE_URL') }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!response.ok)
    { throw new Error(`PAGE_IMAGE_FAILED:${response.status}`) }
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') || '',
    }
  }
  finally {
    clearTimeout(timeout)
  }
}

export const buildKnowledgeDocumentPdf = async (
  title: string,
  images: KnowledgeDocumentPageImage[],
) => {
  if (!images.length)
  { throw new Error('KNOWLEDGE_DOCUMENT_PAGE_IMAGES_EMPTY') }

  const pdf = await PDFDocument.create()
  pdf.setTitle(title)
  pdf.setProducer('知行网络学堂')
  pdf.setCreator('计网Agent')

  for (let offset = 0; offset < images.length; offset += 4) {
    const batch = images.slice(offset, offset + 4)
    const loaded = await Promise.all(batch.map(async image => ({
      ...image,
      ...await fetchPageImage(image.url),
    })))

    for (const image of loaded) {
      const lowerUrl = image.url.toLowerCase()
      const embedded = image.contentType.includes('png') || lowerUrl.endsWith('.png')
        ? await pdf.embedPng(image.bytes)
        : await pdf.embedJpg(image.bytes)
      const page = pdf.addPage([embedded.width, embedded.height])
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      })
    }
  }

  return pdf.save()
}
