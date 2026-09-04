# @promql-validator/monaco

Monaco Editor language adapter for [`promql-validator`](https://www.npmjs.com/package/promql-validator) — syntax highlighting, context-aware completion, and live diagnostics markers, all backed by [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core).

```bash
npm install @promql-validator/monaco monaco-editor
```

```ts
import * as monaco from 'monaco-editor';
import { registerPromQLLanguage } from '@promql-validator/monaco';

registerPromQLLanguage(monaco); // call once, e.g. at app startup

const editor = monaco.editor.create(document.getElementById('editor')!, {
  value: 'rate(http_requests_total[5m])',
  language: 'promql',
});
```

## Options

```ts
registerPromQLLanguage(monaco, {
  dialect: 'promql', // or 'metricsql'
  validationDebounceMs: 150,
  validationOptions: { customFunctions: ['my_custom_func'] },
});
```

`monaco-editor` is an **optional peer dependency** — this package never imports it by value, only through the instance you pass in, so it adds nothing to your bundle beyond this thin adapter (~2KB gzipped).

## License

MIT
