import type { CSSProperties } from 'react';

export interface ThemeOverrides {
  base?: 'light' | 'dark';
  tokens?: Partial<Record<string, string>>;
}

export type Theme = 'light' | 'dark' | ThemeOverrides;

export function resolveTheme(theme: Theme | undefined): { dataTheme: 'light' | 'dark' | undefined; style: CSSProperties } {
  if (!theme || theme === 'light') return { dataTheme: 'light', style: {} };
  if (theme === 'dark') return { dataTheme: 'dark', style: {} };
  const style: CSSProperties = {};
  if (theme.tokens) {
    for (const [key, value] of Object.entries(theme.tokens)) {
      if (value !== undefined) (style as Record<string, string>)[key] = value;
    }
  }
  return { dataTheme: theme.base ?? 'light', style };
}
