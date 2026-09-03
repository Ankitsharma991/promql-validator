# @promql-validator/react

A drop-in, accessible, themeable `<PromQLInput/>` React component — real-time validation, context-aware autocomplete (built-in PromQL + your own static/dynamic/async infrastructure data), bracket/quote completion, and on-demand formatting. Built on [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core).

```bash
npm install @promql-validator/react
```

```tsx
import { PromQLInput } from '@promql-validator/react';
import '@promql-validator/react/styles.css';

<PromQLInput
  value={query}
  onChange={setQuery}
  dynamicSuggestions={[{ category: 'service', values: services }]}
  onValidation={(result) => console.log(result.valid)}
/>;
```

Peer dependencies: `react >= 18`, `react-dom >= 18`. SSR-safe (no `window`/`document` access during render or module load).

Full docs and the monorepo: <https://github.com/promql-validator/promql-validator>.

## License

MIT
