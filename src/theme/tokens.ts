// 车机界面设计令牌，与 design/lx-music-car-claude.pen 的变量同名
// 夜曲 nocturne / 白昼 daylight 直接使用设计稿取值；其他主题只替换强调色与文字色

const NOCTURNE = {
  bg: '#08080A',
  surface: '#121215',
  'surface-2': '#1B1B1F',
  elevated: '#26262B',
  'player-settings-surface': '#1B1B1F',
  'player-settings-track': '#48484E',
  'player-settings-scrim': '#08080A33',
  hairline: 'rgba(255, 255, 255, 0.08)',
  glass: 'rgba(255, 255, 255, 0.06)',
  'glass-strong': 'rgba(255, 255, 255, 0.12)',
  'text-1': '#F5F5F7',
  'text-2': '#A1A1A6',
  'text-3': '#6C6C72',
  accent: '#FF7A50',
  'accent-soft': 'rgba(255, 122, 80, 0.14)',
  'on-primary': '#08080A',
  'rail-bg': 'rgba(0, 0, 0, 0.35)',
  'mini-bg': 'rgba(28, 28, 32, 0.8)',
  'art-stroke': 'rgba(255, 255, 255, 0.1)',
  'track-bg': 'rgba(255, 255, 255, 0.15)',
  'badge-stroke': 'rgba(255, 255, 255, 0.25)',
  'shadow-strong': 'rgba(0, 0, 0, 0.6)',
  'shadow-soft': 'rgba(0, 0, 0, 0.4)',
  'shade-0': 'rgba(8, 8, 10, 0.2)',
  'shade-1': 'rgba(8, 8, 10, 0.8)',
  'shade-2': 'rgba(8, 8, 10, 0.95)',
  'bg-clear': 'rgba(8, 8, 10, 0)',
} as const

export type DesignTokenKey = keyof typeof NOCTURNE
export type DesignTokens = Record<DesignTokenKey, string>

const DAYLIGHT: DesignTokens = {
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  'surface-2': '#EBE8E3',
  elevated: '#FFFFFF',
  'player-settings-surface': '#FFFFFF',
  'player-settings-track': '#D0CBC5',
  'player-settings-scrim': '#30261E24',
  hairline: 'rgba(26, 22, 18, 0.08)',
  glass: 'rgba(26, 22, 18, 0.04)',
  'glass-strong': 'rgba(26, 22, 18, 0.07)',
  'text-1': '#1A1714',
  'text-2': '#6B665F',
  'text-3': '#8E8982',
  accent: '#E8562A',
  'accent-soft': 'rgba(232, 86, 42, 0.12)',
  'on-primary': '#FFFFFF',
  'rail-bg': 'rgba(255, 255, 255, 0.55)',
  'mini-bg': 'rgba(255, 255, 255, 0.85)',
  'art-stroke': 'rgba(26, 22, 18, 0.06)',
  'track-bg': 'rgba(26, 22, 18, 0.12)',
  'badge-stroke': 'rgba(26, 22, 18, 0.2)',
  'shadow-strong': 'rgba(90, 58, 32, 0.15)',
  'shadow-soft': 'rgba(90, 58, 32, 0.1)',
  'shade-0': 'rgba(245, 243, 239, 0.1)',
  'shade-1': 'rgba(245, 243, 239, 0.6)',
  'shade-2': 'rgba(245, 243, 239, 0.95)',
  'bg-clear': 'rgba(245, 243, 239, 0)',
}

export const NOCTURNE_TOKENS: DesignTokens = NOCTURNE
export const DAYLIGHT_TOKENS = DAYLIGHT

/** 车机主题 id，自动主题在这两套之间切换 */
export const CAR_THEME_IDS = {
  dark: 'nocturne',
  light: 'daylight',
} as const

export const isCarTheme = (id: string) => id == CAR_THEME_IDS.dark || id == CAR_THEME_IDS.light

/**
 * 生成主题的设计令牌：底色沿用夜曲/白昼，强调色和文字色取自主题自身配色，
 * 保证选择旧主题或自定义主题时新界面依然完整
 */
export const buildDesignTokens = (theme: LX.Theme): DesignTokens => {
  const base = theme.isDark ? NOCTURNE_TOKENS : DAYLIGHT_TOKENS
  if (isCarTheme(theme.id)) return base
  const colors = theme.config.themeColors
  return {
    ...base,
    'text-1': colors['c-1000'],
    'text-2': colors['c-700'],
    'text-3': colors['c-500'],
    accent: colors['c-primary'],
    'accent-soft': colors['c-primary-alpha-800'],
  }
}
