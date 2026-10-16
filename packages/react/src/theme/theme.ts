import type { CSSProperties } from 'react';

/** `'system'` follows the user's OS/browser colour scheme via `prefers-color-scheme`. */
export type ThemeBase = 'light' | 'dark' | 'system';

export interface ThemeOverrides {
  base?: ThemeBase;
  tokens?: Partial<Record<string, string>>;
}

export type Theme = ThemeBase | ThemeOverrides;

export function resolveTheme(theme: Theme | undefined): { dataTheme: ThemeBase; style: CSSProperties } {
  if (!theme) return { dataTheme: 'light', style: {} };
  if (typeof theme === 'string') return { dataTheme: theme, style: {} };
  const style: CSSProperties = {};
  if (theme.tokens) {
    for (const [key, value] of Object.entries(theme.tokens)) {
      if (value !== undefined) (style as Record<string, string>)[key] = value;
    }
  }
  return { dataTheme: theme.base ?? 'light', style };
}
