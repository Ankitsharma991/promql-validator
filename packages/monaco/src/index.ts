import type * as Monaco from 'monaco-editor';
import { getSuggestions, validatePromQL, type ValidationOptions } from '@promql-validator/core';
import { monarchLanguage, languageConfiguration } from './monarch-language.js';
import { suggestionToCompletionItem, diagnosticToMarker } from './convert.js';

export { monarchLanguage, languageConfiguration } from './monarch-language.js';
export { suggestionToCompletionItem, diagnosticToMarker } from './convert.js';

export const PROMQL_LANGUAGE_ID = 'promql';
const MARKER_OWNER = 'promql-validator';

export interface RegisterPromQLLanguageOptions {
  /** Defaults to 'promql'. */
  dialect?: ValidationOptions['dialect'];
  /** Debounce for the diagnostics pass on content change. Default: 150ms (matches
   * `@promql-validator/react`'s default `validationDebounceMs`). */
  validationDebounceMs?: number;
  /** Extra validators/dictionary overrides, forwarded to `validatePromQL`. */
  validationOptions?: Omit<ValidationOptions, 'dialect'>;
}

/**
 * Registers the `promql` language with Monaco: Monarch syntax highlighting, a context-aware
 * completion provider (backed by `@promql-validator/core`'s `getSuggestions`), and live
 * diagnostics markers (backed by `validatePromQL`) for every model created with this
 * language id. Call once per Monaco instance (e.g. once at app startup) — safe to call
 * multiple times (Monaco itself no-ops a duplicate `languages.register` for the same id).
 *
 * `monaco-editor` is an optional peer dependency — never imported by value here except
 * through the instance you pass in, so this package adds nothing to your bundle unless you
 * actually use it.
 */
export function registerPromQLLanguage(monaco: typeof Monaco, options: RegisterPromQLLanguageOptions = {}): Monaco.IDisposable {
  const dialect = options.dialect ?? 'promql';
  const debounceMs = options.validationDebounceMs ?? 150;

  const disposables: Monaco.IDisposable[] = [];

  const alreadyRegistered = monaco.languages.getLanguages().some((l) => l.id === PROMQL_LANGUAGE_ID);
  if (!alreadyRegistered) {
    monaco.languages.register({ id: PROMQL_LANGUAGE_ID });
  }
  monaco.languages.setMonarchTokensProvider(PROMQL_LANGUAGE_ID, monarchLanguage);
  monaco.languages.setLanguageConfiguration(PROMQL_LANGUAGE_ID, languageConfiguration);

  disposables.push(
    monaco.languages.registerCompletionItemProvider(PROMQL_LANGUAGE_ID, {
      triggerCharacters: ['{', '(', '[', '"', "'", ',', '=', ' '],
      provideCompletionItems(model, position) {
        const value = model.getValue();
        const cursorOffset = model.getOffsetAt(position);
        const results = getSuggestions(value, cursorOffset);
        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
        return { suggestions: results.map((s) => suggestionToCompletionItem(s, monaco, range)) };
      },
    }),
  );

  const debounceTimers = new WeakMap<Monaco.editor.ITextModel, ReturnType<typeof setTimeout>>();

  function validateModel(model: Monaco.editor.ITextModel): void {
    const value = model.getValue();
    const result = validatePromQL(value, { dialect, ...options.validationOptions });
    const markers = result.diagnostics.map((d) => {
      const start = model.getPositionAt(d.start);
      const end = model.getPositionAt(d.end);
      return diagnosticToMarker(d, monaco, start, end);
    });
    monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
  }

  function scheduleValidate(model: Monaco.editor.ITextModel): void {
    const existing = debounceTimers.get(model);
    if (existing) clearTimeout(existing);
    debounceTimers.set(
      model,
      setTimeout(() => validateModel(model), debounceMs),
    );
  }

  function attachModel(model: Monaco.editor.ITextModel): void {
    if (model.getLanguageId() !== PROMQL_LANGUAGE_ID) return;
    scheduleValidate(model);
    const sub = model.onDidChangeContent(() => scheduleValidate(model));
    disposables.push(sub);
    model.onWillDispose(() => {
      const t = debounceTimers.get(model);
      if (t) clearTimeout(t);
      monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    });
  }

  for (const model of monaco.editor.getModels()) attachModel(model);
  disposables.push(monaco.editor.onDidCreateModel(attachModel));

  return {
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
