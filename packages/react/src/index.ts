export { PromQLInput } from './PromQLInput.js';
export type {
  PromQLInputProps,
  PromQLInputHandle,
  EditorSnapshot,
  PartialSlotClassNames,
  KeyboardConfig,
} from './PromQLInput.js';
export type { Theme, ThemeOverrides } from './theme/theme.js';

// Re-export the full core surface for convenience so most consumers only need one import.
export * from '@promql-validator/core';
