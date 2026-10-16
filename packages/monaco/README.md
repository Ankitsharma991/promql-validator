# @promql-validator/monaco

PromQL language support for [Monaco Editor](https://microsoft.github.io/monaco-editor/): syntax highlighting, context-aware completion and live error markers, powered by [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core). It uses the same parser and suggestion engine as the [`promql-validator`](https://www.npmjs.com/package/promql-validator) React editor, so validation behaves identically.

```bash
npm install @promql-validator/monaco monaco-editor
```

```ts
import * as monaco from 'monaco-editor';
import { registerPromQLLanguage } from '@promql-validator/monaco';

registerPromQLLanguage(monaco); // once, at startup

monaco.editor.create(document.getElementById('editor')!, {
  value: 'sum by (job) (rate(http_requests_total[5m]))',
  language: 'promql',
});
```

## What you get

- Highlighting for functions, aggregations, keywords, strings, numbers, durations and `#` comments.
- Completion for functions (inserted as `rate(|)` snippets), metrics, label names, label values, durations and operators, ranked for the cursor position.
- Error and warning markers as you type (debounced), with the same diagnostics as `validatePromQL`.
- `#` line comments and bracket/quote auto-closing.

## Options

```ts
const disposable = registerPromQLLanguage(monaco, {
  dialect: 'promql',                     // or 'metricsql'
  validationDebounceMs: 150,
  validationOptions: { customFunctions: ['acme_rate'], unknownFunctionSeverity: 'error' },

  // Your own completion data
  sources: {
    dynamicSuggestions: [{ category: 'job', values: ['api-server', 'checkout'] }],
    suggestionCategories: { metric: { priorityWeight: 50 } },
  },

  // Async completion (e.g. from your Prometheus API). Cancelled when Monaco cancels the request.
  suggestionProvider: async (context, { signal }) => {
    if (context.astContext !== 'label-value') return [];
    const res = await fetch(`/api/v1/label/${context.activeLabel}/values`, { signal });
    return (await res.json()).data.map((v: string) => ({ label: v, value: v }));
  },

  engineOptions: { maxSuggestions: 100 },
});

disposable.dispose(); // removes the providers and markers listener
```

Lower-level pieces are exported too: `monarchLanguage`, `languageConfiguration`, `suggestionToCompletionItem`, `diagnosticToMarker`, `PROMQL_LANGUAGE_ID`.

`monaco-editor` is a peer dependency. This package only uses the instance you pass in and adds about 2.4 KB gzipped.

## Documentation

**<https://github.com/Ankitsharma991/promql-validator/blob/main/docs/monaco.md>**

## Author

**Ankit Sharma**: [GitHub](https://github.com/Ankitsharma991) · [Portfolio](https://ankitsharma991.com.np) · [sharmaa7861@gmail.com](mailto:sharmaa7861@gmail.com)

## License

MIT © Ankit Sharma
