const preferredTextKeys = [
  'answer',
  'content',
  'text',
  'message',
  'query',
  'output',
  'result',
  'value',
  'data',
]

const stringifyObject = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return ''
  }
}

const toSafeTextInternal = (
  value: unknown,
  fallback: string,
  seen: WeakSet<object>,
  depth: number,
): string => {
  if (typeof value === 'string') {
    const text = /^\[object (Object|Response)\]$/i.test(value.trim()) ? fallback : value
    return text
  }
  if (value == null)
  { return fallback }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
  { return String(value) }
  if (value instanceof Date)
  { return value.toISOString() }
  if (typeof Response !== 'undefined' && value instanceof Response)
  { return `请求失败（HTTP ${value.status || 'unknown'}）` }
  if (value instanceof Error)
  { return value.message || fallback }
  if (typeof value !== 'object')
  { return String(value) }
  if (seen.has(value))
  { return fallback }
  seen.add(value)
  if (depth > 4)
  { return stringifyObject(value) || fallback }

  if (Array.isArray(value)) {
    const joined = value
      .map(item => toSafeTextInternal(item, '', seen, depth + 1))
      .filter(Boolean)
      .join('\n')
    return joined || stringifyObject(value) || fallback
  }

  const record = value as Record<string, unknown>
  for (const key of preferredTextKeys) {
    if (!(key in record))
    { continue }
    const text = toSafeTextInternal(record[key], '', seen, depth + 1)
    if (text.trim())
    { return text }
  }
  return stringifyObject(value) || fallback
}

export const toSafeText = (value: unknown, fallback = '') =>
  toSafeTextInternal(value, fallback, new WeakSet<object>(), 0)

export const toMessageText = (value: unknown, fallback = '') =>
  toSafeText(value, fallback)

export const normalizeTextFields = <T extends Record<string, any>>(
  value: T,
  keys: (keyof T | string)[],
): T => {
  const normalized = { ...value }
  keys.forEach((key) => {
    if (key in normalized)
    { normalized[key as keyof T] = toMessageText(normalized[key as keyof T]) as T[keyof T] }
  })
  return normalized
}
