# CodeMirror 6

```bash
npm install @promql-validator/codemirror @codemirror/state @codemirror/view @codemirror/language @codemirror/autocomplete @codemirror/lint
```

```ts
import { EditorView } from '@codemirror/view';
import { promql } from '@promql-validator/codemirror';

new EditorView({
  doc: 'rate(http_requests_total[5m])',
  parent: container,
  extensions: [
    promql({
      completion: {
        sources: { dynamicSuggestions: [{ category: 'job', values: jobs }] },
        suggestionProvider: async (context, { signal }) => fetchLabelValues(context, signal),
      },
      lint: { dialect: 'promql', delay: 150 },
    }),
  ],
});
```

## What `promql()` includes

- **Language**: a `StreamLanguage` that runs the core lexer, so highlighting matches the validator exactly. Functions, keywords, strings, numbers, durations and `#` comments get their own token types, and `#` is the comment token for toggling.
- **Completion**: `getSuggestions` for the cursor position. Functions are inserted with the cursor between the parentheses. If you configure an async `suggestionProvider`, it's aborted when CodeMirror abandons the request, and its output is sanitised.
- **Lint**: `validatePromQL` diagnostics with the same codes (in `source`) and messages.

Pass `completion: false` or `lint: false` to leave either one out.

## Options

| Option | Type | |
|---|---|---|
| `completion.sources` | `SuggestionSources` | `suggestions`, `dynamicSuggestions`, `suggestionCategories`, `includeBuiltins` |
| `completion.suggestionProvider` | `SuggestionProvider` | Async completion |
| `completion.engineOptions` | `GetSuggestionsOptions` | `maxSuggestions`, `fuzzyMatchThreshold` |
| `lint` | `ValidationOptions & { delay?: number }` | `dialect`, `validators`, `customFunctions`, …; `delay` defaults to 150 ms |

## Building blocks

`promqlLanguage`, `promqlStreamParser`, `promqlCompletionSource(options)`, `promqlLinter(options)` and `computePromQLDiagnostics(text, options)`, the last of which works without a view and is useful in tests.
