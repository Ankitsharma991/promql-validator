import { linter, type Diagnostic as CMDiagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import { validatePromQL, type ValidationOptions } from '@promql-validator/core';

/** The pure diagnostic-computation step, factored out of the `linter()`-wrapped extension
 * below so it's directly unit-testable without spinning up a live `EditorView`. */
export function computePromQLDiagnostics(text: string, validationOptions: ValidationOptions = {}): CMDiagnostic[] {
  const result = validatePromQL(text, validationOptions);
  return result.diagnostics.map((d) => ({
    from: Math.min(d.start, text.length),
    to: Math.min(Math.max(d.end, d.start + 1), text.length),
    severity: d.severity,
    message: d.suggestion ? `${d.message} ${d.suggestion}` : d.message,
    source: d.code,
  }));
}

/** A CodeMirror 6 `linter()` extension backed by `validatePromQL`. Debouncing is handled by
 * `@codemirror/lint`'s own `delay` option (default below matches the React package's
 * `validationDebounceMs` default of 150ms). */
export function promqlLinter(options: ValidationOptions & { delay?: number } = {}) {
  const { delay = 150, ...validationOptions } = options;
  return linter((view: EditorView): CMDiagnostic[] => computePromQLDiagnostics(view.state.doc.toString(), validationOptions), { delay });
}
