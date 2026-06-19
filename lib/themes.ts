export const themes = [
  { id: 'forest', name: '森林青', swatch: '#dff67a' },
  { id: 'ocean', name: '海洋蓝', swatch: '#72d7ff' },
  { id: 'violet', name: '星云紫', swatch: '#c5a3ff' },
  { id: 'sunset', name: '日落橙', swatch: '#ffb06a' },
  { id: 'graphite', name: '石墨灰', swatch: '#d4d8df' },
  { id: 'midnight', name: '深夜模式', swatch: '#0d1420' },
  { id: 'nord', name: '北境蓝灰', swatch: '#9ed9d5' },
  { id: 'rose', name: '柔雾玫瑰', swatch: '#f9a8c2' },
  { id: 'cyber', name: '赛博青', swatch: '#5eead4' },
] as const

export type ThemeId = typeof themes[number]['id']

export const isThemeId = (value: string): value is ThemeId =>
  themes.some(theme => theme.id === value)
