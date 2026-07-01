import { API_PREFIX } from '@/config'
import Toast from '@/app/components/base/toast'
import type { AnnotationReply, MessageEnd, MessageReplace, ThoughtItem } from '@/app/components/chat/type'
import type { VisionFile } from '@/types/app'
import { isNetworkStudyApp } from '@/lib/native-app'
import { normalizeTextFields, toMessageText } from '@/lib/safe-text'

const TIME_OUT = 100000

const ContentType = {
  json: 'application/json',
  stream: 'text/event-stream',
  form: 'application/x-www-form-urlencoded; charset=UTF-8',
  download: 'application/octet-stream', // for download
}

const baseOptions = {
  method: 'GET',
  mode: 'cors',
  credentials: 'include', // always send cookies、HTTP Basic authentication.
  headers: new Headers({
    'Content-Type': ContentType.json,
  }),
  redirect: 'follow',
}

const toFriendlyNetworkError = (error: unknown) => {
  if (typeof Response !== 'undefined' && error instanceof Response)
  { return `请求失败（HTTP ${error.status || 'unknown'}）` }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return `请求失败（HTTP ${toMessageText(status, 'unknown')}）`
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/failed\s*to\s*fetch|networkerror|load failed|request timeout/i.test(message))
  { return '网络连接失败，请检查网络或稍后重试' }
  return message
}

const isChatMessagesEndpoint = (endpoint: string) => /^\/?chat-messages(?:\?|$)/.test(endpoint)

const withNativeServerRelay = (urlWithPrefix: string, endpoint: string) => {
  if (!isNetworkStudyApp() || !isChatMessagesEndpoint(endpoint))
  { return urlWithPrefix }

  try {
    const nextUrl = new URL(urlWithPrefix, globalThis.location.origin)
    if (nextUrl.origin !== globalThis.location.origin)
    { return urlWithPrefix }
    nextUrl.searchParams.set('serverRelay', '1')
    return nextUrl.pathname + nextUrl.search + nextUrl.hash
  }
  catch {
    const separator = urlWithPrefix.includes('?') ? '&' : '?'
    return `${urlWithPrefix}${separator}serverRelay=1`
  }
}

const withoutNativeServerRelay = (urlWithPrefix: string) => {
  try {
    const nextUrl = new URL(urlWithPrefix, globalThis.location.origin)
    nextUrl.searchParams.delete('serverRelay')
    return nextUrl.origin === globalThis.location.origin
      ? `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
      : nextUrl.toString()
  }
  catch {
    return urlWithPrefix.replace(
      /([?&])serverRelay=1(&?)/,
      (_match, prefix: string, suffix: string) => suffix ? prefix : '',
    )
  }
}

const shouldRetryNativeRelay = (urlWithPrefix: string, statusOrCode?: number | string) => {
  if (!isNetworkStudyApp() || !urlWithPrefix.includes('serverRelay=1'))
  { return false }
  const value = String(statusOrCode || '')
  return !value || ['502', '503', '504', 'DIFY_CONNECT_TIMEOUT', 'DIFY_REQUEST_FAILED'].some(code => value.includes(code))
}

export interface WorkflowStartedResponse {
  task_id: string
  workflow_run_id: string
  event: string
  data: {
    id: string
    workflow_id: string
    sequence_number: number
    created_at: number
  }
}

export interface WorkflowFinishedResponse {
  task_id: string
  workflow_run_id: string
  event: string
  data: {
    id: string
    workflow_id: string
    status: string
    outputs: any
    error: string
    elapsed_time: number
    total_tokens: number
    total_steps: number
    created_at: number
    finished_at: number
  }
}

export interface NodeStartedResponse {
  task_id: string
  workflow_run_id: string
  event: string
  data: {
    id: string
    node_id: string
    node_type: string
    title?: string
    status?: string
    index: number
    predecessor_node_id?: string
    inputs: any
    elapsed_time?: number
    created_at: number
    extras?: any
  }
}

export interface NodeFinishedResponse {
  task_id: string
  workflow_run_id: string
  event: string
  data: {
    id: string
    node_id: string
    node_type: string
    title?: string
    index: number
    predecessor_node_id?: string
    inputs: any
    process_data: any
    outputs: any
    status: string
    error: string
    elapsed_time: number
    execution_metadata: {
      total_tokens: number
      total_price: number
      currency: string
    }
    created_at: number
  }
}

export interface IOnDataMoreInfo {
  conversationId?: string
  taskId?: string
  messageId: string
  errorMessage?: string
  errorCode?: string
}

export type IOnData = (message: string, isFirstMessage: boolean, moreInfo: IOnDataMoreInfo) => void
export type IOnThought = (though: ThoughtItem) => void
export type IOnFile = (file: VisionFile) => void
export type IOnMessageEnd = (messageEnd: MessageEnd) => void
export type IOnMessageReplace = (messageReplace: MessageReplace) => void
export type IOnAnnotationReply = (messageReplace: AnnotationReply) => void
export type IOnCompleted = (hasError?: boolean) => void
export type IOnError = (msg: string, code?: string) => void
export type IOnWorkflowStarted = (workflowStarted: WorkflowStartedResponse) => void
export type IOnWorkflowFinished = (workflowFinished: WorkflowFinishedResponse) => void
export type IOnNodeStarted = (nodeStarted: NodeStartedResponse) => void
export type IOnNodeFinished = (nodeFinished: NodeFinishedResponse) => void

interface IOtherOptions {
  isPublicAPI?: boolean
  bodyStringify?: boolean
  needAllResponseContent?: boolean
  deleteContentType?: boolean
  onData?: IOnData // for stream
  onThought?: IOnThought
  onFile?: IOnFile
  onMessageEnd?: IOnMessageEnd
  onMessageReplace?: IOnMessageReplace
  onError?: IOnError
  onCompleted?: IOnCompleted // for stream
  getAbortController?: (abortController: AbortController) => void
  onWorkflowStarted?: IOnWorkflowStarted
  onWorkflowFinished?: IOnWorkflowFinished
  onNodeStarted?: IOnNodeStarted
  onNodeFinished?: IOnNodeFinished
}

function unicodeToChar(text: string) {
  return text.replace(/\\u[0-9a-f]{4}/g, (_match, p1) => {
    return String.fromCharCode(parseInt(p1, 16))
  })
}

const streamTextFrom = (value: unknown, eventName: string) => {
  if (value && typeof value === 'object')
  {
    console.warn(`[chat-stream] ${eventName} returned non-string answer`, value)
  }
  return unicodeToChar(toMessageText(value))
}

const normalizeThoughtPayload = (value: Record<string, any>): ThoughtItem =>
  normalizeTextFields(value, ['thought', 'tool', 'tool_input', 'observation']) as ThoughtItem

const handleStream = (
  response: Response,
  onData: IOnData,
  onCompleted?: IOnCompleted,
  onThought?: IOnThought,
  onMessageEnd?: IOnMessageEnd,
  onMessageReplace?: IOnMessageReplace,
  onFile?: IOnFile,
  onWorkflowStarted?: IOnWorkflowStarted,
  onWorkflowFinished?: IOnWorkflowFinished,
  onNodeStarted?: IOnNodeStarted,
  onNodeFinished?: IOnNodeFinished,
) => {
  if (!response.ok) { throw new Error('Network response was not ok') }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let bufferObj: Record<string, any>
  let isFirstMessage = true
  let persistPromise: Promise<void> | undefined
  const safelyCall = (name: string, callback: (() => void) | undefined) => {
    if (!callback)
    { return }
    try {
      callback()
    }
    catch (error) {
      console.error(`[chat-stream] ${name} callback failed`, error)
    }
  }
  return new Promise<boolean>((resolve) => {
    let completed = false
    const finish = (name: string, hasError = false) => {
      if (completed)
      { return }
      completed = true
      safelyCall(name, () => onCompleted?.(hasError))
      resolve(!hasError)
    }
    function read() {
      let hasError = false
      reader?.read().then(async (result: any) => {
        if (result.done) {
          await persistPromise
          finish('completed')
          return
        }
        buffer += decoder.decode(result.value, { stream: true })
        const lines = buffer.split('\n')
        try {
          lines.forEach((message) => {
            if (message.startsWith('data: ')) { // check if it starts with data:
              try {
                bufferObj = JSON.parse(message.substring(6)) as Record<string, any>// remove data: and parse as json
              }
              catch {
              // mute handle message cut off
                safelyCall('partial-data', () => onData('', isFirstMessage, {
                  conversationId: bufferObj?.conversation_id,
                  messageId: bufferObj?.message_id,
                }))
                return
              }
              if (bufferObj.status === 400 || !bufferObj.event) {
                safelyCall('error-data', () => onData('', false, {
                  conversationId: undefined,
                  messageId: '',
                  errorMessage: toMessageText(bufferObj?.message || bufferObj?.error, '请求返回异常，请稍后重试'),
                  errorCode: toMessageText(bufferObj?.code),
                }))
                hasError = true
                finish('error-completed', true)
                return
              }
              if (bufferObj.event === 'message' || bufferObj.event === 'agent_message') {
              // can not use format here. Because message is splited.
                safelyCall('message', () => onData(streamTextFrom(bufferObj.answer, bufferObj.event), isFirstMessage, {
                  conversationId: bufferObj.conversation_id,
                  taskId: bufferObj.task_id,
                  messageId: bufferObj.id,
                }))
                isFirstMessage = false
              }
              else if (bufferObj.event === 'agent_thought') {
                safelyCall('agent-thought', () => onThought?.(normalizeThoughtPayload(bufferObj)))
              }
              else if (bufferObj.event === 'message_file') {
                safelyCall('message-file', () => onFile?.({
                  ...bufferObj,
                  belongs_to: 'assistant',
                  url: bufferObj.url || bufferObj.file_url || '',
                  name: bufferObj.name || bufferObj.filename,
                } as VisionFile))
              } else if (bufferObj.event === 'relay_persist' && bufferObj.data) {
                persistPromise = globalThis.fetch('/api/chat-persist', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(bufferObj.data),
                }).then(async (persistResponse) => {
                  if (!persistResponse.ok)
                  { throw new Error(`CHAT_PERSIST_FAILED:${persistResponse.status}`) }
                }).catch(error => console.error('[chat-persist] browser callback failed', error))
              }
              else if (bufferObj.event === 'message_end') {
                safelyCall('message-end', () => onMessageEnd?.(bufferObj as MessageEnd))
              }
              else if (bufferObj.event === 'message_replace') {
                safelyCall('message-replace', () => onMessageReplace?.({
                  ...bufferObj,
                  answer: streamTextFrom(bufferObj.answer, 'message_replace'),
                } as MessageReplace))
              }
              else if (bufferObj.event === 'workflow_started') {
                safelyCall('workflow-started', () => onWorkflowStarted?.(bufferObj as WorkflowStartedResponse))
              }
              else if (bufferObj.event === 'workflow_finished') {
                safelyCall('workflow-finished', () => onWorkflowFinished?.(bufferObj as WorkflowFinishedResponse))
              }
              else if (bufferObj.event === 'node_started') {
                safelyCall('node-started', () => onNodeStarted?.(bufferObj as NodeStartedResponse))
              }
              else if (bufferObj.event === 'node_finished') {
                safelyCall('node-finished', () => onNodeFinished?.(bufferObj as NodeFinishedResponse))
              }
            }
          })
          buffer = lines[lines.length - 1]
        }
        catch (e) {
          safelyCall('stream-parse-error', () => onData('', false, {
            conversationId: undefined,
            messageId: '',
            errorMessage: `${e}`,
          }))
          hasError = true
          finish('parse-error-completed', true)
          return
        }
        if (!hasError) { read() }
      }).catch((error: unknown) => {
        safelyCall('stream-read-error', () => onData('', false, {
          conversationId: undefined,
          messageId: '',
          errorMessage: toFriendlyNetworkError(error),
        }))
        finish('read-error-completed', true)
      })
    }
    if (!reader) {
      safelyCall('missing-reader', () => onData('', false, {
        conversationId: undefined,
        messageId: '',
        errorMessage: '浏览器无法读取响应流',
      }))
      finish('missing-reader-completed', true)
      return
    }
    read()
  })
}

const baseFetch = (url: string, fetchOptions: any, { needAllResponseContent }: IOtherOptions) => {
  const options = Object.assign({}, baseOptions, fetchOptions)

  const urlPrefix = API_PREFIX

  let urlWithPrefix = `${urlPrefix}${url.startsWith('/') ? url : `/${url}`}`

  const { method, params, body } = options
  // handle query
  if (method === 'GET' && params) {
    const paramsArray: string[] = []
    Object.keys(params).forEach(key =>
      paramsArray.push(`${key}=${encodeURIComponent(params[key])}`),
    )
    if (urlWithPrefix.search(/\?/) === -1) { urlWithPrefix += `?${paramsArray.join('&')}` }

    else { urlWithPrefix += `&${paramsArray.join('&')}` }

    delete options.params
  }

  if (body) { options.body = JSON.stringify(body) }

  // Handle timeout
  return Promise.race([
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('request timeout'))
      }, TIME_OUT)
    }),
    new Promise((resolve, reject) => {
      globalThis.fetch(urlWithPrefix, options)
        .then(async (res: Response) => {
          const resClone = res.clone()
          // Error handler
          if (!/^(2|3)\d{2}$/.test(String(res.status))) {
            const text = await resClone.text().catch(() => '')
            let data: Record<string, unknown> = {}
            try {
              data = text ? JSON.parse(text) as Record<string, unknown> : {}
            }
            catch {
              // Keep the original text for non-JSON diagnostics.
            }
            const message = res.status === 401
              ? '登录状态已过期，请重新登录'
              : toMessageText(data.message || data.error || text, `请求失败（HTTP ${res.status}）`)
            Toast.notify({ type: 'error', message })
            reject(Object.assign(new Error(message), { status: res.status, response: res }))
            return
          }

          // handle delete api. Delete api not return content.
          if (res.status === 204) {
            resolve({ result: 'success' })
            return
          }

          // return data
          const data = options.headers.get('Content-type') === ContentType.download ? res.blob() : res.json()

          resolve(needAllResponseContent ? resClone : data)
        })
        .catch((err) => {
          Toast.notify({ type: 'error', message: toFriendlyNetworkError(err) })
          reject(err)
        })
    }),
  ])
}

export const upload = (fetchOptions: any): Promise<any> => {
  const urlPrefix = API_PREFIX
  const urlWithPrefix = `${urlPrefix}/file-upload`
  const defaultOptions = {
    method: 'POST',
    url: `${urlWithPrefix}`,
    data: {},
  }
  const options = {
    ...defaultOptions,
    ...fetchOptions,
  }
  return new Promise((resolve, reject) => {
    const xhr = options.xhr
    xhr.open(options.method, options.url)
    for (const key in options.headers || {}) { xhr.setRequestHeader(key, options.headers[key]) }

    xhr.withCredentials = options.withCredentials ?? true
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (/^2\d{2}$/.test(String(xhr.status))) {
          const rawResponse = String(xhr.responseText || xhr.response || '').trim()
          try {
            const parsed = JSON.parse(rawResponse)
            resolve({ id: parsed?.id || rawResponse, data: parsed })
          }
          catch {
            resolve({ id: rawResponse })
          }
        }
        else {
          reject(xhr)
        }
      }
    }
    xhr.upload.onprogress = options.onprogress
    xhr.send(options.data)
  })
}

export const ssePost = (
  url: string,
  fetchOptions: any,
  {
    onData,
    onCompleted,
    onThought,
    onFile,
    onMessageEnd,
    onMessageReplace,
    onWorkflowStarted,
    onWorkflowFinished,
    onNodeStarted,
    onNodeFinished,
    getAbortController,
    onError,
  }: IOtherOptions,
) => {
  const options = Object.assign({}, baseOptions, {
    method: 'POST',
    // Authenticate the same-origin first hop without forwarding unrelated cookies
    // when the request is redirected to the cross-origin browser relay.
    credentials: 'same-origin',
  }, fetchOptions)
  options.headers = new Headers(options.headers)

  const urlPrefix = API_PREFIX
  const urlWithPrefix = withNativeServerRelay(
    `${urlPrefix}${url.startsWith('/') ? url : `/${url}`}`,
    url,
  )

  const { body } = options
  if (body) { options.body = JSON.stringify(body) }
  if (isNetworkStudyApp())
  { options.headers.set('X-Network-Study-App', 'android') }

  const abortController = new AbortController()
  options.signal = abortController.signal
  getAbortController?.(abortController)

  const send = (targetUrl: string, retriedFromNativeRelay = false): Promise<boolean | false> => {
    const requestOptions = {
      ...options,
      headers: new Headers(options.headers),
    }
    return globalThis.fetch(targetUrl, requestOptions)
      .then(async (res: Response) => {
        if (!/^(2|3)\d{2}$/.test(String(res.status))) {
          const text = await res.text().catch(() => '')
          let data: Record<string, any> = {}
          try {
            data = text ? JSON.parse(text) : {}
          }
          catch {
            // Preserve non-JSON diagnostics returned by an upstream proxy.
          }
          const requestId = data.requestId || res.headers.get('X-Request-Id')
          const baseMessage = toMessageText(data.error || data.message || text, `请求失败（HTTP ${res.status}）`)
          const message = requestId ? `${baseMessage}（请求 ID：${requestId}）` : baseMessage
          if (!retriedFromNativeRelay && shouldRetryNativeRelay(targetUrl, res.status || data.code)) {
            console.warn('[chat] native server relay failed, retrying browser relay', {
              status: res.status,
              requestId,
              message: baseMessage,
            })
            return send(withoutNativeServerRelay(targetUrl), true)
          }
          Toast.notify({ type: 'error', message })
          onError?.(message, data.code)
          return false
        }
        return handleStream(res, (str: string, isFirstMessage: boolean, moreInfo: IOnDataMoreInfo) => {
          if (moreInfo.errorMessage) {
            Toast.notify({ type: 'error', message: moreInfo.errorMessage })
            onError?.(moreInfo.errorMessage, moreInfo.errorCode)
            return
          }
          onData?.(str, isFirstMessage, moreInfo)
        }, onCompleted, onThought, onMessageEnd, onMessageReplace, onFile, onWorkflowStarted, onWorkflowFinished, onNodeStarted, onNodeFinished)
      })
      .catch((e) => {
        const message = toFriendlyNetworkError(e)
        if (!retriedFromNativeRelay && shouldRetryNativeRelay(targetUrl)) {
          console.warn('[chat] native server relay network error, retrying browser relay', e)
          return send(withoutNativeServerRelay(targetUrl), true)
        }
        Toast.notify({ type: 'error', message })
        onError?.(message)
        return false
      })
  }

  return send(urlWithPrefix)
}

export const request = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return baseFetch(url, options, otherOptions || {})
}

export const get = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request(url, Object.assign({}, options, { method: 'GET' }), otherOptions)
}

export const post = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request(url, Object.assign({}, options, { method: 'POST' }), otherOptions)
}

export const put = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request(url, Object.assign({}, options, { method: 'PUT' }), otherOptions)
}

export const del = (url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request(url, Object.assign({}, options, { method: 'DELETE' }), otherOptions)
}
