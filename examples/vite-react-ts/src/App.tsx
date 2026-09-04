import { useMemo, useRef, useState } from 'react';
import { PromQLInput, PromQLInputHandle, ValidationResult, Validator } from '@promql-validator/react';
import { CLUSTERS, CONTAINERS, METRIC_NAMES, NAMESPACES, SERVICES, fetchLabelValuesDemo } from './demo-data';

// A minimal custom validator, demonstrating the extension point (Part 28.1 of the PRD):
// it receives the already-parsed AST plus the raw query and returns extra diagnostics
// merged into the same ValidationResult as the built-in checks.
const forbidCardinalityBomb: Validator = (_ast, query) => {
  if (query.includes('__name__=~".*"')) {
    return [
      {
        severity: 'warning',
        code: 'ORG_UNBOUNDED_METRIC_MATCH',
        message: 'Matching all metric names with __name__=~".*" is expensive — consider narrowing it.',
        start: 0,
        end: query.length,
        line: 1,
        column: 1,
      },
    ];
  }
  return [];
};

export default function App() {
  const [query, setQuery] = useState('sum by (service) (rate(http_requests_total{namespace="production"}[5m]))');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [dark, setDark] = useState(false);
  const ref = useRef<PromQLInputHandle>(null);

  const staticSuggestions = useMemo(() => METRIC_NAMES.map((m) => ({ label: m, value: m, category: 'metric', description: 'Demo metric name' })), []);

  const dynamicSuggestions = useMemo(
    () => [
      { category: 'service', values: SERVICES, contexts: [{ astContext: 'label-value' as const, activeLabel: 'service' }] },
      { category: 'namespace', values: NAMESPACES, contexts: [{ astContext: 'label-value' as const, activeLabel: 'namespace' }] },
      { category: 'container', values: CONTAINERS, contexts: [{ astContext: 'label-value' as const, activeLabel: 'container' }] },
      { category: 'cluster', values: CLUSTERS, contexts: [{ astContext: 'label-value' as const, activeLabel: 'cluster' }] },
    ],
    [],
  );

  return (
    <div style={{ maxWidth: 780, margin: '40px auto', fontFamily: 'system-ui, sans-serif', color: dark ? '#e6e6e6' : '#1a1a1a', background: dark ? '#0b0d10' : '#fff', padding: 24 }}>
      <h1 style={{ fontSize: 20 }}>promql-validator — example</h1>
      <p style={{ color: dark ? '#9aa1ac' : '#667085', fontSize: 14 }}>
        Fully offline demo — no Prometheus server required. Try typing <code>rate(</code>, <code>http_requests_total{'{'}</code>, or{' '}
        <code>service=</code> to see context-aware autocomplete; try <code>rate(x[5m)</code> to see a validation error.
      </p>

      <button onClick={() => setDark((d) => !d)} style={{ marginBottom: 16 }}>
        Toggle {dark ? 'light' : 'dark'} mode
      </button>

      <h2 style={{ fontSize: 15 }}>Full-featured editor</h2>
      <PromQLInput
        ref={ref}
        value={query}
        onChange={setQuery}
        onValidation={setValidation}
        theme={dark ? 'dark' : 'light'}
        suggestions={staticSuggestions}
        dynamicSuggestions={dynamicSuggestions}
        suggestionProvider={async (context, { signal }) => {
          if (context.astContext !== 'label-value' || !context.activeLabel) return [];
          const values = await fetchLabelValuesDemo(context.activeLabel, context.tokenBeforeCursor, signal);
          return values.map((v) => ({ label: v, value: v, category: context.activeLabel }));
        }}
        validators={[forbidCardinalityBomb]}
        aria-label="PromQL query"
        style={{ width: '100%' }}
      />

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => ref.current?.format()}>Format (⇧⌥F)</button>
        <button onClick={() => ref.current?.focus()}>Focus</button>
      </div>

      <pre style={{ marginTop: 16, fontSize: 12, background: dark ? '#14161a' : '#f7f7f8', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
        {JSON.stringify(validation, null, 2)}
      </pre>

      <h2 style={{ fontSize: 15, marginTop: 32 }}>Zero-config editor</h2>
      <p style={{ color: dark ? '#9aa1ac' : '#667085', fontSize: 13 }}>
        <code>{'<PromQLInput />'}</code> with no props — validation and built-in PromQL/monitoring autocomplete still work.
      </p>
      <PromQLInput defaultValue="histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" theme={dark ? 'dark' : 'light'} aria-label="Zero-config PromQL query" style={{ width: '100%' }} />

      <h2 style={{ fontSize: 15, marginTop: 32 }}>Web Worker validation (useWorker)</h2>
      <p style={{ color: dark ? '#9aa1ac' : '#667085', fontSize: 13 }}>
        Built-in syntax/semantic validation runs off the main thread here — only verifiable in a real browser (jsdom has no <code>Worker</code>), which is exactly what this section is for.
      </p>
      <PromQLInput defaultValue="rate(x[5m)" useWorker theme={dark ? 'dark' : 'light'} aria-label="Worker-validated PromQL query" style={{ width: '100%' }} />
    </div>
  );
}
