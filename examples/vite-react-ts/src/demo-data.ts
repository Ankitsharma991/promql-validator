// Deterministic, entirely-local demo data — the example works fully offline, with no
// real Prometheus server required (promql-validator itself never talks to one).

export const SERVICES = ['api-server', 'payment-service', 'auth-service', 'checkout-service', 'inventory-service', 'notification-service'];

export const NAMESPACES = ['production', 'staging', 'development'];

export const CONTAINERS = ['nginx', 'app', 'sidecar-envoy', 'redis', 'postgres-exporter'];

export const CLUSTERS = ['us-east-1-primary', 'us-west-2-secondary', 'eu-central-1'];

export const METRIC_NAMES = [
  'http_requests_total',
  'http_request_duration_seconds_bucket',
  'process_cpu_seconds_total',
  'node_memory_MemAvailable_bytes',
  'container_cpu_usage_seconds_total',
  'up',
];

// Simulates a small, realistic label-value lookup a host app would normally fetch from
// its own metrics backend — kept purely in-memory here for the demo.
const LABEL_VALUES: Record<string, string[]> = {
  service: SERVICES,
  namespace: NAMESPACES,
  container: CONTAINERS,
  cluster: CLUSTERS,
};

export async function fetchLabelValuesDemo(label: string, prefix: string, signal: AbortSignal): Promise<string[]> {
  // Simulate realistic network latency so the "loading" state is visible in the demo.
  await new Promise((resolve, reject) => {
    const t = setTimeout(resolve, 250);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });
  const values = LABEL_VALUES[label] ?? [];
  return values.filter((v) => v.toLowerCase().includes(prefix.toLowerCase()));
}
