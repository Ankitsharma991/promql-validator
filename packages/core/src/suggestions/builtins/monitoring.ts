export interface MonitoringTermSpec {
  name: string;
  category: 'label-name' | 'monitoring-term' | 'metric';
  description: string;
}

type Entry = readonly [name: string, description: string];

const spec = (category: MonitoringTermSpec['category'], entries: readonly Entry[]): MonitoringTermSpec[] => entries.map(([name, description]) => ({ name, category, description }));

/**
 * Label names that show up across the Prometheus ecosystem, offered inside `{...}` and in
 * `by (...)` / `on (...)` lists. OpenTelemetry attributes are listed in the form Prometheus
 * stores them after translation (`service.name` → `service_name`); quoted UTF-8 names such
 * as `{"service.name"="api"}` are also accepted by the parser.
 */
export const BUILTIN_LABEL_NAMES: MonitoringTermSpec[] = spec('label-name', [
  // Prometheus
  ['__name__', 'The metric name, as a label (e.g. {__name__=~"http_.*"}).'],
  ['job', 'The configured job name from the scrape config.'],
  ['instance', 'The <host>:<port> of the scraped target.'],
  ['le', 'Histogram bucket upper bound (used with histogram_quantile).'],
  ['quantile', 'Summary quantile label.'],
  ['alertname', 'Alert name (ALERTS / ALERTS_FOR_STATE series).'],
  ['alertstate', 'Alert state: pending or firing (ALERTS series).'],
  ['severity', 'Alert or log severity.'],
  // Topology
  ['cluster', 'Cluster identifier.'],
  ['region', 'Cloud region.'],
  ['zone', 'Availability zone.'],
  ['environment', 'Deployment environment (production, staging, ...).'],
  ['env', 'Deployment environment, short form.'],
  ['tenant', 'Tenant / customer identifier in multi-tenant setups.'],
  ['team', 'Owning team.'],
  ['version', 'Application or build version.'],
  ['service', 'Service name.'],
  // Kubernetes (kube-state-metrics, cAdvisor)
  ['namespace', 'Kubernetes namespace.'],
  ['pod', 'Kubernetes pod name.'],
  ['container', 'Container name.'],
  ['node', 'Node / host identifier.'],
  ['deployment', 'Kubernetes deployment name.'],
  ['statefulset', 'Kubernetes StatefulSet name.'],
  ['daemonset', 'Kubernetes DaemonSet name.'],
  ['replicaset', 'Kubernetes ReplicaSet name.'],
  ['job_name', 'Kubernetes Job name (kube-state-metrics).'],
  ['cronjob', 'Kubernetes CronJob name.'],
  ['persistentvolumeclaim', 'PersistentVolumeClaim name.'],
  ['image', 'Container image.'],
  ['phase', 'Pod / PVC phase (Running, Pending, ...).'],
  ['reason', 'Status reason (e.g. OOMKilled, CrashLoopBackOff).'],
  ['resource', 'Resource kind for requests/limits (cpu, memory).'],
  ['condition', 'Kubernetes condition status (true, false, unknown).'],
  // node_exporter
  ['cpu', 'CPU core index (node_cpu_seconds_total).'],
  ['mode', 'CPU mode: user, system, idle, iowait, ...'],
  ['device', 'Disk or network device.'],
  ['fstype', 'Filesystem type.'],
  ['mountpoint', 'Filesystem mount point.'],
  // HTTP / RPC
  ['method', 'HTTP method (GET, POST, ...).'],
  ['route', 'Templated request route.'],
  ['handler', 'Route / handler name.'],
  ['path', 'Request path.'],
  ['status', 'Response / status code.'],
  ['status_code', 'Response / status code.'],
  ['code', 'Result / error code.'],
  ['scheme', 'URL scheme (http, https).'],
  ['grpc_service', 'gRPC service name.'],
  ['grpc_method', 'gRPC method name.'],
  ['grpc_code', 'gRPC status code.'],
  ['grpc_type', 'gRPC call type (unary, client_stream, ...).'],
  // OpenTelemetry semantic conventions (Prometheus-translated)
  ['service_name', 'OTel service.name.'],
  ['service_namespace', 'OTel service.namespace.'],
  ['service_instance_id', 'OTel service.instance.id.'],
  ['service_version', 'OTel service.version.'],
  ['deployment_environment_name', 'OTel deployment.environment.name.'],
  ['host_name', 'OTel host.name.'],
  ['k8s_cluster_name', 'OTel k8s.cluster.name.'],
  ['k8s_namespace_name', 'OTel k8s.namespace.name.'],
  ['k8s_pod_name', 'OTel k8s.pod.name.'],
  ['k8s_deployment_name', 'OTel k8s.deployment.name.'],
  ['k8s_node_name', 'OTel k8s.node.name.'],
  ['k8s_container_name', 'OTel k8s.container.name.'],
  ['cloud_provider', 'OTel cloud.provider.'],
  ['cloud_region', 'OTel cloud.region.'],
  ['cloud_availability_zone', 'OTel cloud.availability_zone.'],
  ['http_request_method', 'OTel http.request.method.'],
  ['http_response_status_code', 'OTel http.response.status_code.'],
  ['http_route', 'OTel http.route.'],
  ['url_scheme', 'OTel url.scheme.'],
  ['server_address', 'OTel server.address.'],
  ['server_port', 'OTel server.port.'],
  ['network_protocol_version', 'OTel network.protocol.version.'],
  ['rpc_system', 'OTel rpc.system.'],
  ['rpc_service', 'OTel rpc.service.'],
  ['rpc_method', 'OTel rpc.method.'],
  ['rpc_grpc_status_code', 'OTel rpc.grpc.status_code.'],
  ['db_system', 'OTel db.system.'],
  ['db_operation_name', 'OTel db.operation.name.'],
  ['messaging_system', 'OTel messaging.system.'],
  ['messaging_operation_name', 'OTel messaging.operation.name.'],
  ['error_type', 'OTel error.type.'],
  ['otel_scope_name', 'Instrumentation scope that produced the metric.'],
  ['otel_scope_version', 'Instrumentation scope version.'],
  ['telemetry_sdk_language', 'OTel telemetry.sdk.language.'],
  // Traces: span metrics and service graphs (OTel collector, Tempo)
  ['span_name', 'Span name (span metrics).'],
  ['span_kind', 'Span kind: SPAN_KIND_SERVER, SPAN_KIND_CLIENT, ...'],
  ['client', 'Calling service (service graph edges).'],
  ['server', 'Called service (service graph edges).'],
  ['connection_type', 'Service graph edge type (messaging_system, database, ...).'],
  ['trace_id', 'Trace ID, typically attached as an exemplar.'],
  ['span_id', 'Span ID, typically attached as an exemplar.'],
  // Logs: log-derived metrics (Loki recording rules, log pipelines)
  ['level', 'Log level (debug, info, warn, error).'],
  ['detected_level', 'Log level detected by Loki.'],
  ['severity_text', 'OTel log severity text.'],
  ['logger', 'Logger name.'],
  ['stream', 'Log stream (stdout, stderr).'],
  ['filename', 'Source log file.'],
]);

/**
 * Well-known metric names exposed by the most widely deployed exporters and by OpenTelemetry
 * semantic conventions. Hosts with their own metric catalog should pass it as dynamic
 * suggestions — those rank above these — or switch this set off with
 * `suggestionCategories={{ metric: { enabled: false } }}`.
 */
export const BUILTIN_METRICS: MonitoringTermSpec[] = spec('metric', [
  // Prometheus
  ['up', '1 if the last scrape of the target succeeded, 0 otherwise.'],
  ['scrape_duration_seconds', 'Duration of the last scrape.'],
  ['scrape_samples_scraped', 'Samples the target exposed in the last scrape.'],
  ['ALERTS', 'Active alerts (pending and firing).'],
  ['prometheus_tsdb_head_series', 'Series currently in the head block.'],
  ['prometheus_http_requests_total', 'HTTP requests served by Prometheus.'],
  // Process / Go runtime
  ['process_cpu_seconds_total', 'Process CPU time.'],
  ['process_resident_memory_bytes', 'Process resident memory.'],
  ['process_open_fds', 'Open file descriptors.'],
  ['process_start_time_seconds', 'Process start time (unix seconds).'],
  ['go_goroutines', 'Number of goroutines.'],
  ['go_memstats_heap_inuse_bytes', 'Go heap in use.'],
  // node_exporter
  ['node_cpu_seconds_total', 'CPU time per core and mode.'],
  ['node_load1', '1-minute load average.'],
  ['node_memory_MemAvailable_bytes', 'Memory available for new processes.'],
  ['node_memory_MemTotal_bytes', 'Total memory.'],
  ['node_filesystem_avail_bytes', 'Filesystem space available to non-root users.'],
  ['node_filesystem_size_bytes', 'Filesystem size.'],
  ['node_disk_io_time_seconds_total', 'Time spent doing disk I/O.'],
  ['node_network_receive_bytes_total', 'Network bytes received.'],
  ['node_network_transmit_bytes_total', 'Network bytes transmitted.'],
  // cAdvisor / kubelet
  ['container_cpu_usage_seconds_total', 'Container CPU time.'],
  ['container_memory_working_set_bytes', 'Container working-set memory (what the OOM killer sees).'],
  ['container_network_receive_bytes_total', 'Container network bytes received.'],
  ['container_fs_usage_bytes', 'Container filesystem usage.'],
  // kube-state-metrics
  ['kube_pod_status_phase', 'Pod phase (Pending, Running, ...).'],
  ['kube_pod_container_status_restarts_total', 'Container restarts.'],
  ['kube_deployment_status_replicas_available', 'Available replicas per deployment.'],
  ['kube_node_status_condition', 'Node conditions (Ready, MemoryPressure, ...).'],
  ['kube_pod_container_resource_requests', 'Container resource requests.'],
  ['kube_pod_container_resource_limits', 'Container resource limits.'],
  // OpenTelemetry semantic conventions
  ['http_server_request_duration_seconds', 'OTel HTTP server request duration (histogram).'],
  ['http_client_request_duration_seconds', 'OTel HTTP client request duration (histogram).'],
  ['rpc_server_duration_milliseconds', 'OTel RPC server duration (histogram).'],
  ['db_client_operation_duration_seconds', 'OTel database client operation duration (histogram).'],
  ['target_info', 'OTel resource attributes as an info metric (use with info()).'],
  // Traces: span metrics / service graphs
  ['traces_spanmetrics_calls_total', 'Span calls (span metrics).'],
  ['traces_spanmetrics_latency_bucket', 'Span latency histogram buckets (span metrics).'],
  ['traces_service_graph_request_total', 'Requests between services (service graph).'],
  ['traces_service_graph_request_failed_total', 'Failed requests between services (service graph).'],
  ['traces_service_graph_request_server_seconds_bucket', 'Server-side latency between services (service graph).'],
]);

/**
 * Observability vocabulary — golden signals, RED/USE, SLOs, and the signal types themselves.
 * Offered as search hints so typing an intent ("latency", "errors") surfaces something even
 * before the host provides its own metric catalog.
 */
export const BUILTIN_MONITORING_TERMS: MonitoringTermSpec[] = spec('monitoring-term', [
  ['latency', 'Golden signal: how long requests take.'],
  ['traffic', 'Golden signal: demand on the system (requests/s).'],
  ['errors', 'Golden signal: rate of failing requests.'],
  ['saturation', 'Golden signal: how full a resource is (queue depth, load).'],
  ['utilization', 'USE method: busy time of a resource.'],
  ['throughput', 'Operations or bytes per second.'],
  ['availability', 'Uptime / success ratio.'],
  ['error_budget', 'SLO: allowed unreliability left in the window.'],
  ['burn_rate', 'SLO: how fast the error budget is being spent.'],
  ['sli', 'Service level indicator.'],
  ['slo', 'Service level objective.'],
  ['apdex', 'Application performance index.'],
  ['p50', 'Median latency (histogram_quantile(0.5, ...)).'],
  ['p95', '95th percentile (histogram_quantile(0.95, ...)).'],
  ['p99', '99th percentile (histogram_quantile(0.99, ...)).'],
  ['counter', 'Metric type: monotonically increasing (use rate/increase).'],
  ['gauge', 'Metric type: value that goes up and down.'],
  ['histogram', 'Metric type: bucketed observations (_bucket, _sum, _count).'],
  ['summary', 'Metric type: client-side quantiles.'],
  ['cpu', 'CPU utilization / time.'],
  ['memory', 'Memory usage.'],
  ['disk', 'Disk usage / IO.'],
  ['network', 'Network traffic.'],
  ['requests', 'Request counters.'],
  ['uptime', 'Time since process / service start.'],
  ['restarts', 'Restart / crash counters.'],
  ['oom', 'Out-of-memory kills.'],
  ['queue', 'Queue depth / lag.'],
  ['connections', 'Open connections.'],
  ['traces', 'Trace-derived metrics (span metrics, service graphs).'],
  ['spans', 'Span counts and durations.'],
  ['logs', 'Log-derived metrics (log lines, error logs).'],
]);
