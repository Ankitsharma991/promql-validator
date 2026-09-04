import { LanguageSupport } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { promqlLanguage } from './stream-language.js';
import { promqlCompletionSource, type PromQLCompletionOptions } from './completion.js';
import { promqlLinter } from './lint-source.js';
import type { ValidationOptions } from '@promql-validator/core';

export { promqlLanguage, promqlStreamParser } from './stream-language.js';
export { promqlCompletionSource } from './completion.js';
export type { PromQLCompletionOptions } from './completion.js';
export { promqlLinter, computePromQLDiagnostics } from './lint-source.js';

export interface PromQLExtensionOptions {
  completion?: PromQLCompletionOptions | false;
  lint?: (ValidationOptions & { delay?: number }) | false;
}

/**
 * The all-in-one CodeMirror 6 extension: syntax highlighting + context-aware completion +
 * live linting, all backed by `@promql-validator/core`.
 *
 * ```ts
 * import { EditorView } from '@codemirror/view';
 * import { promql } from '@promql-validator/codemirror';
 *
 * new EditorView({ extensions: [promql({ completion: { sources: { dynamicSuggestions } } })] });
 * ```
 */
export function promql(options: PromQLExtensionOptions = {}): Extension {
  const extensions: Extension[] = [];

  if (options.completion !== false) {
    const support = new LanguageSupport(promqlLanguage, [autocompletion({ override: [promqlCompletionSource(options.completion ?? {})] })]);
    extensions.push(support);
  } else {
    extensions.push(promqlLanguage);
  }

  if (options.lint !== false) {
    extensions.push(promqlLinter(options.lint ?? {}));
  }

  return extensions;
}
