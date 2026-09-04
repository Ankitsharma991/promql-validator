# Quick Start

## The editor, zero configuration

```tsx
import { useState } from 'react';
import { PromQLInput } from 'promql-validator';
import 'promql-validator/styles.css';

export function QueryBox() {
  const [query, setQuery] = useState('rate(http_requests_total[5m])');
  return <PromQLInput value={query} onChange={setQuery} aria-label="PromQL query" />;
}
```

You get, with no further setup: real-grammar syntax/semantic validation with an error panel, built-in PromQL + monitoring-vocabulary autocomplete, bracket/quote completion, and a keyboard-navigable, accessible combobox.

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

Next: [Validation API](./validation.md) · [Editor Component](./editor-component.md) · [Theming](./theming.md).
