import 'server-only'

export const difyApiBaseUrl = (
  process.env.DIFY_API_BASE_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'https://dify.jasonsome.cn:22380/v1'
).replace(/\/$/, '')

export const difyApiKey = process.env.DIFY_API_KEY

const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504])

export const fetchDify = async (
  path: string,
  init: RequestInit = {},
  options: { apiKey?: string, connectTimeoutMs?: number, retries?: number } = {},
) => {
  const apiKey = options.apiKey || difyApiKey
  if (!apiKey)
  { throw new Error('DIFY_API_NOT_CONFIGURED') }

  const connectTimeoutMs = options.connectTimeoutMs ?? 8_000
  const retries = options.retries ?? (init.method && init.method !== 'GET' ? 0 : 1)
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error('DIFY_CONNECT_TIMEOUT')), connectTimeoutMs)
    const abortFromRequest = () => controller.abort(init.signal?.reason)
    if (init.signal?.aborted)
    { abortFromRequest() }
    init.signal?.addEventListener('abort', abortFromRequest, { once: true })

    try {
      const response = await fetch(`${difyApiBaseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...init.headers,
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (response.ok || !transientStatuses.has(response.status) || attempt === retries)
      { return response }
      await response.body?.cancel()
    }
    catch (error) {
      clearTimeout(timeout)
      lastError = error
      if (attempt === retries)
      { throw error }
    }
  }

  throw lastError || new Error('DIFY_REQUEST_FAILED')
}

export const fetchDifyJson = async <T>(
  path: string,
  init: RequestInit = {},
  options?: { apiKey?: string, connectTimeoutMs?: number, retries?: number },
) => {
  const response = await fetchDify(path, init, options)
  if (!response.ok)
  { throw new Error(`DIFY_REQUEST_FAILED:${response.status}`) }
  return response.json() as Promise<T>
}
