import type { ClipboardEvent } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { imageUpload } from './utils'
import Toast from '@/app/components/base/toast'
import type { ImageFile } from '@/types/app'
import { TransferMethod } from '@/types/app'

export const useImageFiles = () => {
  const { t } = useTranslation()
  const { notify } = Toast
  const [files, setFiles] = useState<ImageFile[]>([])
  const filesRef = useRef<ImageFile[]>([])

  const handleUpload = (imageFile: ImageFile) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFile._id)

    if (index > -1) {
      const currentFile = files[index]
      const newFiles = [...files.slice(0, index), { ...currentFile, ...imageFile }, ...files.slice(index + 1)]
      setFiles(newFiles)
      filesRef.current = newFiles
    }
    else {
      const newFiles = [...files, imageFile]
      setFiles(newFiles)
      filesRef.current = newFiles
    }
  }
  const handleRemove = (imageFileId: string) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFileId)

    if (index > -1) {
      const currentFile = files[index]
      const newFiles = [...files.slice(0, index), { ...currentFile, deleted: true }, ...files.slice(index + 1)]
      setFiles(newFiles)
      filesRef.current = newFiles
    }
  }
  const handleImageLinkLoadError = (imageFileId: string) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFileId)

    if (index > -1) {
      const currentFile = files[index]
      const newFiles = [...files.slice(0, index), { ...currentFile, progress: -1 }, ...files.slice(index + 1)]
      filesRef.current = newFiles
      setFiles(newFiles)
    }
  }
  const handleImageLinkLoadSuccess = (imageFileId: string) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFileId)

    if (index > -1) {
      const currentImageFile = files[index]
      const newFiles = [...files.slice(0, index), { ...currentImageFile, progress: 100 }, ...files.slice(index + 1)]
      filesRef.current = newFiles
      setFiles(newFiles)
    }
  }
  const handleReUpload = (imageFileId: string) => {
    const files = filesRef.current
    const index = files.findIndex(file => file._id === imageFileId)

    if (index > -1) {
      const currentImageFile = files[index]
      imageUpload({
        file: currentImageFile.file!,
        onProgressCallback: (progress) => {
          const newFiles = [...files.slice(0, index), { ...currentImageFile, progress }, ...files.slice(index + 1)]
          filesRef.current = newFiles
          setFiles(newFiles)
        },
        onSuccessCallback: (res) => {
          const newFiles = [...files.slice(0, index), { ...currentImageFile, fileId: res.id, url: res.url || currentImageFile.url, progress: 100 }, ...files.slice(index + 1)]
          filesRef.current = newFiles
          setFiles(newFiles)
        },
        onErrorCallback: () => {
          notify({ type: 'error', message: t('common.imageUploader.uploadFromComputerUploadError') })
          const newFiles = [...files.slice(0, index), { ...currentImageFile, progress: -1 }, ...files.slice(index + 1)]
          filesRef.current = newFiles
          setFiles(newFiles)
        },
      })
    }
  }

  const handleClear = () => {
    setFiles([])
    filesRef.current = []
  }

  const handleClipboardPaste = useCallback((event: ClipboardEvent<HTMLTextAreaElement>, limit = 5) => {
    const image = Array.from(event.clipboardData?.files || []).find(file => file.type.startsWith('image/'))
    if (!image)
    { return false }
    if (filesRef.current.filter(file => !file.deleted).length >= limit) {
      notify({ type: 'error', message: `最多可上传 ${limit} 张图片` })
      return true
    }

    event.preventDefault()
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const imageFile: ImageFile = {
        type: TransferMethod.local_file,
        _id: `${Date.now()}-${image.name}`,
        fileId: '',
        file: image,
        url: reader.result as string,
        base64Url: reader.result as string,
        progress: 0,
      }
      handleUpload(imageFile)
      imageUpload({
        file: image,
        onProgressCallback: progress => handleUpload({ ...imageFile, progress }),
        onSuccessCallback: result => handleUpload({ ...imageFile, fileId: result.id, url: result.url || imageFile.url, progress: 100 }),
        onErrorCallback: () => {
          notify({ type: 'error', message: t('common.imageUploader.uploadFromComputerUploadError') })
          handleUpload({ ...imageFile, progress: -1 })
        },
      })
    })
    reader.readAsDataURL(image)
    return true
  }, [notify, t])

  const filteredFiles = useMemo(() => {
    return files.filter(file => !file.deleted)
  }, [files])

  return {
    files: filteredFiles,
    onUpload: handleUpload,
    onRemove: handleRemove,
    onImageLinkLoadError: handleImageLinkLoadError,
    onImageLinkLoadSuccess: handleImageLinkLoadSuccess,
    onReUpload: handleReUpload,
    onClear: handleClear,
    onPaste: handleClipboardPaste,
  }
}
