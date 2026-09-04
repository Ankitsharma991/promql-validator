// A Server Component (the default in the App Router) rendering a Client Component that
// owns the interactive editor — demonstrates that `<PromQLInput/>` renders correctly
// server-side (no window/document access during render) and hydrates cleanly.
import { QueryEditor } from './QueryEditor';

export default function Page() {
  return (
    <main>
      <h1 style={{ fontSize: 20 }}>promql-validator — Next.js App Router</h1>
      <p style={{ color: '#667085', fontSize: 14 }}>
        This page is server-rendered; the editor below is a Client Component (<code>&apos;use client&apos;</code>) that hydrates on the client. Try an invalid
        query like <code>rate(x[5m)</code> to see the diagnostics panel.
      </p>
      <QueryEditor initialQuery="rate(http_requests_total{service=&quot;api-server&quot;}[5m])" />
    </main>
  );
}
