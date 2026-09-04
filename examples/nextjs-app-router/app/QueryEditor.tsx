'use client';

import { useState } from 'react';
import { PromQLInput, type ValidationResult } from '@promql-validator/react';

const SERVICES = ['api-server', 'payment-service', 'auth-service'];

export function QueryEditor({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  return (
    <div>
      <PromQLInput
        value={query}
        onChange={setQuery}
        onValidation={setValidation}
        dynamicSuggestions={[{ category: 'service', values: SERVICES, contexts: [{ astContext: 'label-value', activeLabel: 'service' }] }]}
        aria-label="PromQL query"
        style={{ width: '100%' }}
      />
      <pre style={{ marginTop: 12, fontSize: 12, background: '#f7f7f8', padding: 12, borderRadius: 6 }}>{JSON.stringify(validation, null, 2)}</pre>
    </div>
  );
}
