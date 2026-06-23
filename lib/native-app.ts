'use client'

export interface NativeDownloadSettings {
  customDirectory: boolean
  directoryName: string
  appVersion: string
}

export interface NativeQqLoginResult {
  accessToken: string
  openId: string
  expiresIn?: string
  purpose?: 'login' | 'bind'
}

export interface NativeQqResultEnvelope {
  status: 'success' | 'error'
  detail: NativeQqLoginResult & { message?: string }
}

declare global {
  interface Window {
    NetworkStudyApp?: {
      getDownloadSettings: () => string
      chooseDownloadDirectory: () => void
      resetDownloadDirectory: () => void
      saveBase64Image: (dataUrl: string, filename: string) => void
      getBridgeVersion?: () => string
      loginWithQQ: () => void
      bindQQ?: () => void
      consumePendingQqResult?: () => string
      setShellState: (path: string, title: string, eyebrow: string) => void
      hideShell: () => void
      setConversationMode?: (detail: boolean) => void
    }
  }
}

export const isNetworkStudyApp = () =>
  typeof navigator !== 'undefined' && /NetworkStudyAndroid/i.test(navigator.userAgent)

export const readNativeDownloadSettings = (): NativeDownloadSettings | null => {
  try {
    const value = window.NetworkStudyApp?.getDownloadSettings()
    return value ? JSON.parse(value) as NativeDownloadSettings : null
  }
  catch {
    return null
  }
}
