/**
 * Opt-in hooks for watching the editor's health in your own observability stack. Nothing
 * fires unless you pass them. Events carry timings, counts and flags only — never query text
 * or suggestion values — so they're safe to forward to any third-party tool.
 */
export interface TelemetryHooks {
  /** After each validation pass. `durationMs` excludes the debounce delay. */
  onValidation?: (event: { durationMs: number; valid: boolean; incomplete: boolean; diagnosticCount: number; instanceId?: string }) => void;
  /** After suggestions are filtered and ranked for the current cursor position. */
  onSuggestionQuery?: (event: { durationMs: number; resultCount: number; instanceId?: string }) => void;
  /** When an async `suggestionProvider` rejects. */
  onSuggestionProviderError?: (event: { error: unknown; instanceId?: string }) => void;
}
