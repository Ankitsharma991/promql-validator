# @promql-validator/codemirror

CodeMirror 6 language extension for [`promql-validator`](https://www.npmjs.com/package/promql-validator) — syntax highlighting, context-aware completion, and live linting, all backed by [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core).

```bash
npm install @promql-validator/codemirror @codemirror/state @codemirror/view @codemirror/language @codemirror/autocomplete @codemirror/lint
```

```ts
import { EditorView } from '@codemirror/view';
import { promql } from '@promql-validator/codemirror';

new EditorView({
  doc: 'rate(http_requests_total[5m])',
  extensions: [promql()],
  parent: document.getElementById('editor')!,
});
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

The syntax highlighter reuses `@promql-validator/core`'s real lexer (via CodeMirror's `StreamLanguage` bridge) rather than a second, separately-maintained regex grammar, so highlighting can never drift out of sync with what the validator itself considers a token.

The `@codemirror/*` packages are **optional peer dependencies** — never bundled.

## License

MIT
