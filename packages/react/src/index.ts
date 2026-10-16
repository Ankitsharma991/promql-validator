import { PromQLInput } from './PromQLInput.js';

export { PromQLInput };
export default PromQLInput;
export { promqlStylesheet } from './theme/inject-styles.js';
export type {
  PromQLInputProps,
  PromQLInputHandle,
  EditorSnapshot,
  PartialSlotClassNames,
  KeyboardConfig,
} from './PromQLInput.js';
export type { Theme, ThemeOverrides } from './theme/theme.js';
export { ValidationWorkerClient } from './worker-client.js';
export type { WorkerRequest, WorkerResponse } from './worker-protocol.js';
export { PromQLValidatorProvider, PromQLSuggestionRegistryProvider, useSuggestionRegistry } from './SuggestionRegistry.js';
export { defaultMessages } from './messages.js';
export type { PromQLMessages } from './messages.js';
export type { TelemetryHooks } from './telemetry.js';
export type { SuggestionRegistryValue, PromQLSuggestionRegistryProviderProps } from './SuggestionRegistry.js';

// Re-export the full core surface for convenience so most consumers only need one import.
export * from '@promql-validator/core';
