# promql-validator

A PromQL editor and validator for React and the command line: live syntax highlighting, validation that matches Prometheus, one-click quick fixes and context-aware autocomplete, in one package.

```bash
npm install promql-validator
```

```tsx
import { useState } from 'react';
import { PromQLInput } from 'promql-validator';
import 'promql-validator/styles.css';

export function QueryEditor() {
  const [query, setQuery] = useState('rate(http_requests_total[5m])');
  return <PromQLInput value={query} onChange={setQuery} aria-label="PromQL query" />;
}
```

That's all the setup you need. Highlighting, validation, built-in autocomplete and bracket completion work immediately.

This package bundles [`@promql-validator/react`](https://www.npmjs.com/package/@promql-validator/react) and [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core) and adds a CLI. If you don't use React, install `@promql-validator/core` instead.

## Features

- **Validation that matches Prometheus**: a hand-written, error-tolerant parser covering all of PromQL, including Prometheus 3 UTF-8 names, `@ start()`/`@ end()`, subqueries and duration expressions. Checks arity, range-vector arguments, vector matching and modifiers.
- **Typing-aware**: half-written queries like `rate(` or `up{job="` are *incomplete*, not errors, and a token is never flagged while you're still completing it.
- **Quick fixes**: *Insert missing ')'*, *Add range '[5m]'*, *Replace with 'rate'*, *Insert an empty value ""*.
- **Syntax highlighting** with wavy error underlines, over a native `<input>` (IME, undo and screen readers keep working).
- **Autocomplete** that knows where the cursor is: functions, metrics, label names, label values, durations, operators. Ships with all 86 PromQL functions and 170 well-known metric, label and observability terms (Prometheus, node_exporter, Kubernetes, OpenTelemetry, traces, logs).
- **Your data**: static lists, dynamic groups indexed for 100k+ values, and async providers with debouncing, cancellation and caching.
- **Themes**: light, dark and `system`, fully customisable through CSS variables.
- **Accessible**: ARIA combobox, full keyboard support, axe-tested.
- **i18n, telemetry hooks and plugins** for larger products.
- **CLI** for linting queries and Prometheus rule files in CI.
- **Private by design**: no network requests of its own, nothing persisted, works offline.

## Common setups

### Suggest your own label values

```tsx
<PromQLInput
  value={query}
  onChange={setQuery}
  dynamicSuggestions={[
    { category: 'job', values: jobs },
    { category: 'namespace', values: namespaces },
  ]}
/>
```

Values in the `job` group are offered when the cursor is in `{job="…"}`.

### Fetch suggestions from your metrics backend

```tsx
<PromQLInput
  suggestionProvider={async (context, { signal }) => {
    if (context.astContext !== 'label-value') return [];
    const res = await fetch(`/api/v1/label/${context.activeLabel}/values`, { signal });
    const { data } = await res.json();
    return data.map((v: string) => ({ label: v, value: v, category: context.activeLabel }));
  }}
/>
```

### Run the query on Enter and react to validation

```tsx
<PromQLInput
  value={query}
  onChange={setQuery}
  onSubmit={(q) => runQuery(q)}
  onValidation={({ valid, incomplete }) => setCanRun(valid && !incomplete)}
  showValidIndicator
/>
```

### Dark mode

```tsx
<PromQLInput theme="system" />  {/* follows the OS setting */}
<PromQLInput theme={{ base: 'dark', tokens: { '--promql-input-radius': '4px' } }} />
```

### Validate without a UI

Everything from `@promql-validator/core` is re-exported:

```ts
import { validatePromQL, formatPromQL } from 'promql-validator';

validatePromQL('sum(rate(http_requests_total[5m])) by (job)').valid; // true
formatPromQL('sum by (job,code) (rate(x[5m]))'); // 'sum by (job, code) (rate(x[5m]))'
```

## Main props

| Prop | Type | Default | |
|---|---|---|---|
| `value` / `defaultValue` | `string` | | Controlled or uncontrolled value |
| `onChange` | `(value) => void` | | Called on every edit |
| `onSubmit` | `(value) => void` | | Enter while the suggestion popup is closed |
| `onValidation` | `(result) => void` | | After each (debounced) validation |
| `dynamicSuggestions` | `DynamicSuggestionGroup[]` | | Your label values, metrics, services… |
| `suggestionProvider` | `(context, { signal }) => Promise<Suggestion[]>` | | Async suggestions |
| `theme` | `'light' \| 'dark' \| 'system' \| ThemeOverrides` | `'light'` | |
| `dialect` | `'promql' \| 'metricsql'` | `'promql'` | |
| `diagnosticsDisplay` | `'below' \| 'inline' \| 'none'` | `'below'` | Where errors are shown |
| `showValidIndicator` | `boolean` | `false` | Green check for valid queries |
| `validators` / `plugins` | | | Your own rules |
| `messages` / `locale` | | | Translate any UI text |
| `telemetryHooks` | | | Opt-in timing events |

The full list (54 props, plus a ref API) is in the [editor component docs](https://github.com/Ankitsharma991/promql-validator/blob/main/docs/editor-component.md).

## CLI

```bash
npx promql-validator lint queries.txt               # one query per line; lines starting with # are skipped
npx promql-validator lint rules.yml --rules         # every expr: in a Prometheus rule file
cat queries.txt | npx promql-validator lint - --format json
```

Exits with code 1 if any query is invalid, so it can gate a CI job.

## Documentation

Full documentation, examples and the other packages: **<https://github.com/Ankitsharma991/promql-validator>**

| Package | Use it for |
|---|---|
| `promql-validator` | React editor + core + CLI (this package) |
| [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core) | Validation, formatting and suggestions without React |
| [`@promql-validator/react`](https://www.npmjs.com/package/@promql-validator/react) | Just the React component |
| [`@promql-validator/monaco`](https://www.npmjs.com/package/@promql-validator/monaco) | Monaco Editor support |
| [`@promql-validator/codemirror`](https://www.npmjs.com/package/@promql-validator/codemirror) | CodeMirror 6 support |

## Author

**Ankit Sharma**: [GitHub](https://github.com/Ankitsharma991) · [Portfolio](https://ankitsharma991.com.np) · [sharmaa7861@gmail.com](mailto:sharmaa7861@gmail.com)

Issues and pull requests: <https://github.com/Ankitsharma991/promql-validator/issues>

## License

MIT © Ankit Sharma
