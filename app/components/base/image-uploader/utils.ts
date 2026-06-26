'use client'

import { upload } from '@/service/base'

interface ImageUploadParams {
  file: File
  onProgressCallback: (progress: number) => void
  onSuccessCallback: (res: { id: string }) => void
  onErrorCallback: () => void
}
type ImageUpload = (v: ImageUploadParams) => void
const maxUploadBytes = 600 * 1024
const maxUploadEdge = 1600

export const compressImageForUpload = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif')
  { return file }
  if (file.size <= maxUploadBytes)
  { return file }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const element = new Image()
    element.onload = () => {
      URL.revokeObjectURL(url)
      resolve(element)
    }
    element.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('IMAGE_DECODE_FAILED'))
    }
    element.src = url
  })

  const scale = Math.min(1, maxUploadEdge / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context)
  { return file }
  context.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', 0.82),
  )
  if (!blob || blob.size >= file.size)
  { return file }
  const filename = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${filename}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
}

export const imageUpload: ImageUpload = async ({
  file,
  onProgressCallback,
  onSuccessCallback,
  onErrorCallback,
}) => {
  let uploadFile = file
  try {
    uploadFile = await compressImageForUpload(file)
  }
  catch {
    uploadFile = file
  }
  const formData = new FormData()
  formData.append('file', uploadFile)
  const onProgress = (e: ProgressEvent) => {
    if (e.lengthComputable) {
      const percent = Math.floor(e.loaded / e.total * 100)
      onProgressCallback(percent)
    }
  }

  upload({
    xhr: new XMLHttpRequest(),
    data: formData,
    onprogress: onProgress,
  })
    .then((res: { id: string }) => {
      onSuccessCallback(res)
    })
    .catch(() => {
      onErrorCallback()
    })
}
