# Quick Start

## The editor, zero configuration

```tsx
import { useState } from 'react';
import { PromQLInput } from 'promql-validator';

export function QueryBox() {
  const [query, setQuery] = useState('rate(http_requests_total[5m])');
  return <PromQLInput value={query} onChange={setQuery} aria-label="PromQL query" />;
}
```

With no further setup you get syntax highlighting, validation with quick fixes, autocomplete for PromQL and common observability names, bracket and quote completion, and an accessible, keyboard-driven combobox.

## Uncontrolled mode

```tsx
<PromQLInput defaultValue="up" onChange={(v) => console.log(v)} aria-label="PromQL query" />
```

## Reacting to validation

```tsx
<PromQLInput
  value={query}
  onChange={setQuery}
  onValidation={(result) => {
    // result: { valid: boolean; diagnostics: Diagnostic[]; incomplete: boolean }
    setErrorCount(result.diagnostics.filter((d) => d.severity === 'error').length);
  }}
/>
```

## Adding your own infrastructure data

```tsx
<PromQLInput
  value={query}
  onChange={setQuery}
  dynamicSuggestions={[
    { category: 'service', values: services }, // string[] or Suggestion[]
    { category: 'namespace', values: namespaces },
  ]}
/>
```

Typing inside `service="` now autocompletes against your live list, ranked above generic built-ins. See [Dynamic Suggestions](./dynamic-suggestions.md) and [Async Providers](./async-providers.md) for fetching this from a real backend.

## Validating a query without any UI

```ts
import { validatePromQL } from '@promql-validator/core';

const result = validatePromQL('rate(http_requests_total[5m)');
// { valid: false, incomplete: false, diagnostics: [{ code: 'PQ_UNCLOSED_BRACKET', message: "Expected closing ']'...", ... }] }
```

## Dark mode

```tsx
<PromQLInput theme="system" />
```

## Run the query on Enter

```tsx
<PromQLInput value={query} onChange={setQuery} onSubmit={runQuery} />
```

Next: [Editor component](./editor-component.md) · [Validation](./validation.md) · [PromQL support](./syntax-support.md) · [Theming](./theming.md).
