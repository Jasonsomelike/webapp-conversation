export const themes = [
  { id: 'forest', name: '森林青', swatch: '#dff67a' },
  { id: 'ocean', name: '海洋蓝', swatch: '#72d7ff' },
  { id: 'violet', name: '星云紫', swatch: '#c5a3ff' },
  { id: 'sunset', name: '日落橙', swatch: '#ffb06a' },
  { id: 'graphite', name: '石墨灰', swatch: '#d4d8df' },
] as const

export type ThemeId = typeof themes[number]['id']

export const isThemeId = (value: string): value is ThemeId =>
  themes.some(theme => theme.id === value)
