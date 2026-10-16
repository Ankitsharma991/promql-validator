# @promql-validator/codemirror

PromQL language support for [CodeMirror 6](https://codemirror.net/): syntax highlighting, context-aware completion and linting, powered by [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core). It uses the same parser and suggestion engine as the [`promql-validator`](https://www.npmjs.com/package/promql-validator) React editor, so validation behaves identically.

```bash
npm install @promql-validator/codemirror @codemirror/state @codemirror/view @codemirror/language @codemirror/autocomplete @codemirror/lint
```

```ts
import { EditorView } from '@codemirror/view';
import { promql } from '@promql-validator/codemirror';

new EditorView({
  doc: 'sum by (job) (rate(http_requests_total[5m]))',
  extensions: [promql()], // add basicSetup from the `codemirror` package for the usual editor chrome
  parent: document.getElementById('editor')!,
});
```

## What you get

- Highlighting driven by the core lexer itself, so it never disagrees with the validator. Covers functions, keywords, strings, numbers, durations and `#` comments.
- Completion for functions (inserted with the cursor inside the parentheses), metrics, label names, label values, durations and operators.
- Lint diagnostics as you type, with the same messages and codes as `validatePromQL`.
- `#` as the line-comment token for comment toggling.

## Options

```ts
promql({
  completion: {
    sources: { dynamicSuggestions: [{ category: 'job', values: ['api-server', 'checkout'] }] },
    // Async completion. Aborted when CodeMirror abandons the request.
    suggestionProvider: async (context, { signal }) => {
      if (context.astContext !== 'label-value') return [];
      const res = await fetch(`/api/v1/label/${context.activeLabel}/values`, { signal });
      return (await res.json()).data.map((v: string) => ({ label: v, value: v }));
    },
    engineOptions: { maxSuggestions: 100 },
  },
  lint: { dialect: 'promql', delay: 150, customFunctions: ['acme_rate'] },
});

promql({ completion: false });  // highlighting + linting only
promql({ lint: false });        // highlighting + completion only
```

## Composing the pieces yourself

```ts
import { promqlLanguage, promqlCompletionSource, promqlLinter } from '@promql-validator/codemirror';
import { autocompletion } from '@codemirror/autocomplete';

const extensions = [
  promqlLanguage,
  autocompletion({ override: [promqlCompletionSource({ sources: { dynamicSuggestions } })] }),
  promqlLinter({ dialect: 'metricsql' }),
];
```

`computePromQLDiagnostics(text, options)` returns CodeMirror diagnostics without a view, which is handy for tests.

The `@codemirror/*` packages are peer dependencies. This package adds about 2 KB gzipped.

## Documentation

**<https://github.com/Ankitsharma991/promql-validator/blob/main/docs/codemirror.md>**

## Author

**Ankit Sharma**: [GitHub](https://github.com/Ankitsharma991) · [Portfolio](https://ankitsharma991.com.np) · [sharmaa7861@gmail.com](mailto:sharmaa7861@gmail.com)

## License

MIT © Ankit Sharma
