# @promql-validator/core

Framework-agnostic PromQL parser, validator, formatter, and suggestion engine — zero runtime dependencies, no DOM/React. Usable in Node (CLI/CI linting), the browser, or as the engine behind [`@promql-validator/react`](https://www.npmjs.com/package/@promql-validator/react)'s `<PromQLInput/>`.

```bash
npm install @promql-validator/core
```

```ts
import { validatePromQL, formatPromQL, getSuggestions } from '@promql-validator/core';

validatePromQL('rate(http_requests_total[5m)');
// { valid: false, incomplete: false, diagnostics: [{ code: 'PQ_UNCLOSED_BRACKET', ... }] }

formatPromQL('rate(x[5m])');
// 'rate(x[5m])' — deterministic, idempotent, semantics-preserving (throws on unparseable input)

getSuggestions('rate(http_requests_total{', 26);
// context-aware built-in suggestions (label names, since we're inside `{`)
```

Full docs and the monorepo: <https://github.com/promql-validator/promql-validator>.

## License

MIT
