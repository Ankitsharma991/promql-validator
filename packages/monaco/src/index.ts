import type * as Monaco from 'monaco-editor';
import {
  extractContext,
  getSuggestions,
  runSuggestionProvider,
  validatePromQL,
  type GetSuggestionsOptions,
  type SuggestionProvider,
  type SuggestionSources,
  type ValidationOptions,
} from '@promql-validator/core';
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
  /** Your own completion data: static `suggestions`, `dynamicSuggestions` groups, category settings. */
  sources?: Omit<SuggestionSources, 'providedSuggestions'>;
  /** Async completion source (e.g. label values from your metrics backend). Cancelled when
   * Monaco cancels the completion request. */
  suggestionProvider?: SuggestionProvider;
  /** Ranking options such as `maxSuggestions`. */
  engineOptions?: GetSuggestionsOptions;
}

/**
 * Registers the `promql` language with Monaco: highlighting, context-aware completion
 * (`getSuggestions` plus your own sources) and live diagnostics markers (`validatePromQL`)
 * for every model using this language id. Call it once per Monaco instance; calling it
 * again is harmless. Returns a disposable that removes the providers.
 *
 * `monaco-editor` is only used through the instance you pass in, never imported directly.
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
      async provideCompletionItems(model, position, _context, token) {
        const value = model.getValue();
        const cursorOffset = model.getOffsetAt(position);
        let providedSuggestions;
        if (options.suggestionProvider) {
          const controller = new AbortController();
          token.onCancellationRequested(() => controller.abort());
          providedSuggestions = await runSuggestionProvider(options.suggestionProvider, extractContext(value, cursorOffset), controller.signal);
        }
        const results = getSuggestions(value, cursorOffset, { ...options.sources, providedSuggestions }, options.engineOptions);
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
