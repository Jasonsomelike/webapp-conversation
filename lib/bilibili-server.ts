import 'server-only'

const cleanHeaderValue = (value?: string) => value?.replace(/[\r\n]+/g, '').trim() || ''

export const getBilibiliRequestHeaders = (accept: string) => {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
    'Referer': 'https://www.bilibili.com/',
    'Accept': accept,
  }
  const cookie = cleanHeaderValue(process.env.BILIBILI_COOKIE || process.env.BILIBILI_COOKIES)
  if (cookie)
  { headers.Cookie = cookie }
  return headers
}
