import { useState } from 'react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import { PromQLInput, type ValidationResult } from '@promql-validator/react';

const SERVICES = ['api-server', 'payment-service', 'auth-service'];

// Statically generated at build time — demonstrates that <PromQLInput/> renders correctly
// during `next build`'s SSG pass (no window/document access) and hydrates cleanly on the
// client, the same guarantee the App Router example verifies for Server Components.
export const getStaticProps: GetStaticProps<{ initialQuery: string }> = async () => ({
  props: { initialQuery: 'rate(http_requests_total{service="api-server"}[5m])' },
});

export default function Home({ initialQuery }: InferGetStaticPropsType<typeof getStaticProps>) {
  const [query, setQuery] = useState(initialQuery);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 780, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 20 }}>promql-validator — Next.js Pages Router</h1>
      <p style={{ color: '#667085', fontSize: 14 }}>
        <code>initialQuery</code> comes from <code>getStaticProps</code> (statically generated at build time). Try an invalid query like <code>rate(x[5m)</code> to see the diagnostics panel.
      </p>
      <PromQLInput
        value={query}
        onChange={setQuery}
        onValidation={setValidation}
        dynamicSuggestions={[{ category: 'service', values: SERVICES, contexts: [{ astContext: 'label-value', activeLabel: 'service' }] }]}
        aria-label="PromQL query"
        style={{ width: '100%' }}
      />
      <pre style={{ marginTop: 12, fontSize: 12, background: '#f7f7f8', padding: 12, borderRadius: 6 }}>{JSON.stringify(validation, null, 2)}</pre>
    </main>
  );
}
