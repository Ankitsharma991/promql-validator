export interface MonitoringTermSpec {
  name: string;
  category: 'label-name' | 'monitoring-term';
  description: string;
}

// Common label names encountered across the Prometheus ecosystem (job/instance are
// nearly universal; the rest are common exporter/service-mesh/k8s conventions). These
// are offered as *label-name* completions inside `{...}`, never as metric names — the
// package has no built-in metric list since metric names are inherently application-specific.
export const BUILTIN_LABEL_NAMES: MonitoringTermSpec[] = [
  { name: 'job', category: 'label-name', description: 'The configured job name from the scrape config.' },
  { name: 'instance', category: 'label-name', description: 'The `<host>:<port>` of the scraped target.' },
  { name: 'method', category: 'label-name', description: 'HTTP method (GET, POST, ...).' },
  { name: 'status', category: 'label-name', description: 'Response/status code.' },
  { name: 'status_code', category: 'label-name', description: 'Response/status code.' },
  { name: 'path', category: 'label-name', description: 'Request path or route.' },
  { name: 'handler', category: 'label-name', description: 'Route/handler name.' },
  { name: 'code', category: 'label-name', description: 'Result/error code.' },
  { name: 'namespace', category: 'label-name', description: 'Kubernetes namespace.' },
  { name: 'pod', category: 'label-name', description: 'Kubernetes pod name.' },
  { name: 'container', category: 'label-name', description: 'Container name.' },
  { name: 'service', category: 'label-name', description: 'Service name.' },
  { name: 'cluster', category: 'label-name', description: 'Cluster identifier.' },
  { name: 'node', category: 'label-name', description: 'Node/host identifier.' },
  { name: 'deployment', category: 'label-name', description: 'Kubernetes deployment name.' },
  { name: 'region', category: 'label-name', description: 'Cloud region.' },
  { name: 'zone', category: 'label-name', description: 'Availability zone.' },
  { name: 'environment', category: 'label-name', description: 'Deployment environment (e.g. production, staging).' },
  { name: 'env', category: 'label-name', description: 'Deployment environment, short form.' },
  { name: 'version', category: 'label-name', description: 'Application/build version.' },
  { name: 'le', category: 'label-name', description: 'Histogram bucket upper bound (used with histogram_quantile).' },
  { name: 'quantile', category: 'label-name', description: 'Summary quantile label.' },
];

// Common domain terms, offered mainly as search/keyword hints rather than exact
// insertions — useful for fuzzy-matching a user's intent ("latency" -> duration/histogram
// functions) even though the package has no built-in metric catalog.
export const BUILTIN_MONITORING_TERMS: MonitoringTermSpec[] = [
  { name: 'cpu', category: 'monitoring-term', description: 'CPU utilization/time.' },
  { name: 'memory', category: 'monitoring-term', description: 'Memory usage.' },
  { name: 'disk', category: 'monitoring-term', description: 'Disk usage/IO.' },
  { name: 'network', category: 'monitoring-term', description: 'Network traffic.' },
  { name: 'latency', category: 'monitoring-term', description: 'Request/operation latency.' },
  { name: 'requests', category: 'monitoring-term', description: 'Request counters.' },
  { name: 'errors', category: 'monitoring-term', description: 'Error counters.' },
  { name: 'availability', category: 'monitoring-term', description: 'Uptime/availability ratio.' },
  { name: 'throughput', category: 'monitoring-term', description: 'Operations/bytes per second.' },
  { name: 'saturation', category: 'monitoring-term', description: 'Resource saturation (queue depth, load).' },
  { name: 'uptime', category: 'monitoring-term', description: 'Time since process/service start.' },
  { name: 'restarts', category: 'monitoring-term', description: 'Restart/crash counters.' },
];
