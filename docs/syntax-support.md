# PromQL Support

What the parser, validator and autocomplete understand. Behaviour is checked against a [conformance corpus](https://github.com/Ankitsharma991/promql-validator/blob/main/packages/core/conformance/promql.json) of queries labelled with the verdict Prometheus itself gives them.

## Syntax

| Construct | Examples |
|---|---|
| Selectors | `up`, `{job="api"}`, `http_requests_total{code=~"5..", method!="GET"}`, `{__name__=~"node_.*"}` |
| UTF-8 names (Prometheus 3) | `{"http.server.duration"}`, `{"my.metric", "service.name"="api"}`, `sum by ("service.name") (…)` |
| Matchers | `=`, `!=`, `=~`, `!~`; trailing commas allowed |
| Strings | `"double"`, `'single'`, `` `raw` `` with the usual escapes |
| Numbers | `42`, `-2.5`, `3.4e-9`, `0x8f`, `1_000_000`, `.5`, `Inf`, `NaN` |
| Range vectors | `x[5m]`, `x[1h30m]`, `x[54s321ms]`, `x[300]` (seconds) |
| Duration units | `ms`, `s`, `m`, `h`, `d`, `w`, `y`, largest first, each once |
| Duration expressions | `x[5m * 2]`, `x offset (1h / 2)`, `rate(x[step() * 4])`, `x[max_of(step(), 5s)]` (also `min_of`, `range()`) |
| Subqueries | `rate(x[5m])[30m:1m]`, `max_over_time(rate(x[5m])[1h:])` |
| `offset` | `x offset 5m`, `x offset -1w`, `rate(x[5m] offset 1w)` |
| `@` modifier | `x @ 1609746000`, `x @ start()`, `x @ end()`, combined with `offset` in either order |
| Aggregations | `sum by (job) (x)`, `sum(x) without (instance)`, `topk(5, x)`, `count_values("v", x)` |
| Binary operators | arithmetic, comparison with `bool`, `and` / `or` / `unless`, `atan2`, unary `-` / `+`, right-associative `^` |
| Vector matching | `on (…)`, `ignoring (…)`, `group_left (…)`, `group_right (…)` |
| Comments | `# to end of line`, anywhere whitespace is allowed |
| Keywords as names | `by`, `offset`, `sum` … work as metric names; `bool`, `on`, `ignoring`, `group_left`, `group_right` need `{__name__="on"}` (as in Prometheus) |

## Validation rules

**Syntax**: unexpected tokens, unclosed or mismatched brackets, missing label values, malformed durations, non-positive ranges, repeated `offset`/`@`, conflicting `by`/`without`, too-deep nesting.

**Semantics** (once the syntax is clean):

- Function arity, including optional and variadic arguments (`round(x[, to_nearest])`, `label_join(v, dst, sep, src...)`).
- Range-vector arguments in the right position (`rate(x)` is an error; `quantile_over_time(0.9, x[5m])` checks the second argument).
- Aggregation arity: `sum(x)` takes one argument; `topk(k, x)`, `quantile(φ, x)`, `count_values("label", x)`, `limitk`, `limit_ratio` take two.
- `group_left`/`group_right` can't be used with `and`, `or`, `unless`.
- Unknown functions are a warning by default (Prometheus adds functions regularly) with a "Did you mean …?" suggestion.

**Unfinished input** is never an error: `rate(`, `rate()`, `sum()`, `topk(5, )`, `up{`, `up{job="`, `x[]`, `foo +` all return `incomplete: true` with no diagnostics.

## Functions (86)

Functions marked *experimental* need Prometheus' `--enable-feature=promql-experimental-functions`. They're recognised so they aren't flagged as unknown, and autocomplete labels them.

| Signature | Description |
|---|---|
| `abs(v instant-vector)` | Returns the input vector with all sample values converted to their absolute value. |
| `absent(v instant-vector)` | Returns an empty vector if the input vector has elements, and a 1-element vector with the value 1 if it has no elements. |
| `absent_over_time(v range-vector)` | Returns a 1-element vector with the value 1 if the range vector passed has no elements. |
| `acos(v instant-vector)` | Calculates the arccosine of all elements in v. |
| `acosh(v instant-vector)` | Calculates the inverse hyperbolic cosine of all elements in v. |
| `asin(v instant-vector)` | Calculates the arcsine of all elements in v. |
| `asinh(v instant-vector)` | Calculates the inverse hyperbolic sine of all elements in v. |
| `atan(v instant-vector)` | Calculates the arctangent of all elements in v. |
| `atanh(v instant-vector)` | Calculates the inverse hyperbolic tangent of all elements in v. |
| `avg_over_time(v range-vector)` | The average value of all points in the specified range. |
| `ceil(v instant-vector)` | Rounds the sample values up to the nearest integer. |
| `changes(v range-vector)` | Returns the number of times its value changed within the provided time range. |
| `clamp(v instant-vector, min scalar, max scalar)` | Clamps the sample values to a specified minimum and maximum. |
| `clamp_max(v instant-vector, max scalar)` | Clamps the sample values to a specified maximum. |
| `clamp_min(v instant-vector, min scalar)` | Clamps the sample values to a specified minimum. |
| `cos(v instant-vector)` | Calculates the cosine of all elements in v. |
| `cosh(v instant-vector)` | Calculates the hyperbolic cosine of all elements in v. |
| `count_over_time(v range-vector)` | The count of all values in the specified range. |
| `day_of_month(v=vector(time()) instant-vector)` | Returns the day of the month for each of the given times in UTC. |
| `day_of_week(v=vector(time()) instant-vector)` | Returns the day of the week for each of the given times in UTC. |
| `day_of_year(v=vector(time()) instant-vector)` | Returns the day of the year for each of the given times in UTC. |
| `days_in_month(v=vector(time()) instant-vector)` | Returns the number of days in the month for each of the given times in UTC. |
| `deg(v instant-vector)` | Converts radians to degrees for all elements in v. |
| `delta(v range-vector)` | Calculates the difference between the first and last value of each time series in a range vector. |
| `deriv(v range-vector)` | Calculates the per-second derivative of the time series using simple linear regression. |
| `double_exponential_smoothing(v range-vector, sf scalar, tf scalar)` | Produces a smoothed value for time series based on the range in v. *(experimental)* |
| `exp(v instant-vector)` | Calculates the exponential function for all elements in v. |
| `first_over_time(v range-vector)` | The oldest point value in the specified range. *(experimental)* |
| `floor(v instant-vector)` | Rounds the sample values down to the nearest integer. |
| `histogram_avg(v instant-vector)` | Returns the arithmetic average of observed values stored in a native histogram. |
| `histogram_count(v instant-vector)` | Returns the count of observations stored in a native histogram. |
| `histogram_fraction(lower scalar, upper scalar, v instant-vector)` | Returns the estimated fraction of observations between the provided bounds in a native histogram. |
| `histogram_quantile(φ scalar, b instant-vector)` | Calculates the φ-quantile from a conventional or native histogram. |
| `histogram_quantiles(b instant-vector, label string, φ scalar, ...)` | Calculates several φ-quantiles at once, writing each into the given label. *(experimental)* |
| `histogram_stddev(v instant-vector)` | Returns the estimated standard deviation of observations in a native histogram. |
| `histogram_stdvar(v instant-vector)` | Returns the estimated standard variance of observations in a native histogram. |
| `histogram_sum(v instant-vector)` | Returns the sum of observations stored in a native histogram. |
| `holt_winters(v range-vector, sf scalar, tf scalar)` | Prometheus 2.x name for double_exponential_smoothing (renamed in Prometheus 3.0). |
| `hour(v=vector(time()) instant-vector)` | Returns the hour of the day for each of the given times in UTC. |
| `idelta(v range-vector)` | Calculates the difference between the last two samples in the range vector. |
| `increase(v range-vector)` | Calculates the increase in the time series over a range, extrapolated to cover the full range. |
| `info(v instant-vector, [dataLabelSelector instant-vector])` | Finds related info metric series and adds their identifying labels to the results. *(experimental)* |
| `integral(v range-vector, [unit scalar])` | The integral of the series over the specified range. *(experimental)* |
| `irate(v range-vector)` | Calculates the per-second instant rate of increase using the last two data points. |
| `label_join(v instant-vector, dst_label, separator, src_label_1, ...)` | Joins values of several source labels into a destination label using a separator. |
| `label_replace(v instant-vector, dst_label, replacement, src_label, regex)` | Matches a regex against a source label and replaces/creates a destination label. |
| `last_over_time(v range-vector)` | The most recent point value in the specified range. |
| `ln(v instant-vector)` | Calculates the natural logarithm for all elements in v. |
| `log10(v instant-vector)` | Calculates the decimal logarithm for all elements in v. |
| `log2(v instant-vector)` | Calculates the binary logarithm for all elements in v. |
| `mad_over_time(v range-vector)` | The median absolute deviation of all points in the specified range. *(experimental)* |
| `max_over_time(v range-vector)` | The maximum value of all points in the specified range. |
| `min_over_time(v range-vector)` | The minimum value of all points in the specified range. |
| `minute(v=vector(time()) instant-vector)` | Returns the minute of the hour for each of the given times in UTC. |
| `month(v=vector(time()) instant-vector)` | Returns the month of the year for each of the given times in UTC. |
| `pi()` | Returns the constant pi. |
| `predict_linear(v range-vector, t scalar)` | Predicts the value of a time series t seconds from now, based on simple linear regression. |
| `present_over_time(v range-vector)` | The value 1 for any series in the specified range that has a present value. |
| `quantile_over_time(φ scalar, v range-vector)` | The φ-quantile of all values in the specified range. |
| `rad(v instant-vector)` | Converts degrees to radians for all elements in v. |
| `rate(v range-vector)` | Calculates the per-second average rate of increase of a counter over a range. |
| `resets(v range-vector)` | Returns the number of counter resets within the provided time range. |
| `round(v instant-vector, to_nearest=1 scalar)` | Rounds sample values to the nearest integer, or to the nearest multiple of to_nearest. |
| `scalar(v instant-vector)` | Given a single-element input vector, returns the sample value as a scalar. Returns NaN otherwise. |
| `sgn(v instant-vector)` | Returns -1, 0, or 1 depending on the sign of the sample values. |
| `sin(v instant-vector)` | Calculates the sine of all elements in v. |
| `sinh(v instant-vector)` | Calculates the hyperbolic sine of all elements in v. |
| `sort(v instant-vector)` | Returns the elements of v sorted by their sample values, ascending. |
| `sort_by_label(v instant-vector, label, ...)` | Returns elements of v sorted by their label values, ascending. *(experimental)* |
| `sort_by_label_desc(v instant-vector, label, ...)` | Returns elements of v sorted by their label values, descending. *(experimental)* |
| `sort_desc(v instant-vector)` | Returns the elements of v sorted by their sample values, descending. |
| `sqrt(v instant-vector)` | Calculates the square root of all elements in v. |
| `start_timestamp(v instant-vector)` | The start (created) timestamp of each sample, where the series exposes one. *(experimental)* |
| `stddev_over_time(v range-vector)` | The population standard deviation of the values in the specified range. |
| `stdvar_over_time(v range-vector)` | The population standard variance of the values in the specified range. |
| `sum_over_time(v range-vector)` | The sum of all values in the specified range. |
| `tan(v instant-vector)` | Calculates the tangent of all elements in v. |
| `tanh(v instant-vector)` | Calculates the hyperbolic tangent of all elements in v. |
| `time()` | Returns the number of seconds since January 1, 1970 UTC. |
| `timestamp(v instant-vector)` | Returns the timestamp of each of the samples of the given vector as the number of seconds since epoch. |
| `ts_of_first_over_time(v range-vector)` | The timestamp of the oldest sample in the specified range. *(experimental)* |
| `ts_of_last_over_time(v range-vector)` | The timestamp of the most recent sample in the specified range. *(experimental)* |
| `ts_of_max_over_time(v range-vector)` | The timestamp of the maximum value in the specified range. *(experimental)* |
| `ts_of_min_over_time(v range-vector)` | The timestamp of the minimum value in the specified range. *(experimental)* |
| `vector(s scalar)` | Returns the scalar s as a vector with no labels. |
| `year(v=vector(time()) instant-vector)` | Returns the year for each of the given times in UTC. |

## Aggregations

| Signature | Description |
|---|---|
| `sum [by\|without (labels)] (v instant-vector)` | Sums the sample values over dimensions. |
| `avg [by\|without (labels)] (v instant-vector)` | Averages the sample values over dimensions. |
| `min [by\|without (labels)] (v instant-vector)` | Selects the minimum sample value over dimensions. |
| `max [by\|without (labels)] (v instant-vector)` | Selects the maximum sample value over dimensions. |
| `count [by\|without (labels)] (v instant-vector)` | Counts the number of elements in the vector over dimensions. |
| `count_values("label", v instant-vector)` | Counts the number of elements with the same value, adding a new label with that value. |
| `stddev [by\|without (labels)] (v instant-vector)` | Calculates the population standard deviation over dimensions. |
| `stdvar [by\|without (labels)] (v instant-vector)` | Calculates the population standard variance over dimensions. |
| `topk(k scalar, v instant-vector)` | Selects the k largest elements by sample value. |
| `bottomk(k scalar, v instant-vector)` | Selects the k smallest elements by sample value. |
| `quantile(φ scalar, v instant-vector)` | Calculates the φ-quantile of the sample values over dimensions. |
| `group [by\|without (labels)] (v instant-vector)` | Groups series that have common label values; every result has a value of 1. |
| `limitk(k scalar, v instant-vector)` | Sample k series from the input, in no particular order. Experimental. |
| `limit_ratio(r scalar, v instant-vector)` | Sample a pseudo-random ratio r of series from the input. Experimental. |

## Operators and keywords

- **arithmetic**: `+`, `-`, `*`, `/`, `%`, `^`, `atan2`
- **comparison**: `==`, `!=`, `>`, `<`, `>=`, `<=`
- **logical**: `and`, `or`, `unless`
- **modifier**: `bool`, `by`, `without`, `on`, `ignoring`, `group_left`, `group_right`, `offset`

Autocomplete offers operators and modifiers after a complete expression, and durations (15s, 30s, 1m, 5m, 10m, 15m, 30m, 1h, 3h, 6h, 12h, 1d, 2d, 7d) inside `[…]`.

## Observability vocabulary

Autocomplete includes names that show up across real Prometheus deployments, so the editor is useful before you connect your own metric catalog. They rank below anything you provide.

**Label names**: `__name__`, `job`, `instance`, `le`, `quantile`, `alertname`, `alertstate`, `severity`, `cluster`, `region`, `zone`, `environment`, `env`, `tenant`, `team`, `version`, `service`, `namespace`, `pod`, `container`, `node`, `deployment`, `statefulset`, `daemonset`, `replicaset`, `job_name`, `cronjob`, `persistentvolumeclaim`, `image`, `phase`, `reason`, `resource`, `condition`, `cpu`, `mode`, `device`, `fstype`, `mountpoint`, `method`, `route`, `handler`, `path`, `status`, `status_code`, `code`, `scheme`, `grpc_service`, `grpc_method`, `grpc_code`, `grpc_type`, `service_name`, `service_namespace`, `service_instance_id`, `service_version`, `deployment_environment_name`, `host_name`, `k8s_cluster_name`, `k8s_namespace_name`, `k8s_pod_name`, `k8s_deployment_name`, `k8s_node_name`, `k8s_container_name`, `cloud_provider`, `cloud_region`, `cloud_availability_zone`, `http_request_method`, `http_response_status_code`, `http_route`, `url_scheme`, `server_address`, `server_port`, `network_protocol_version`, `rpc_system`, `rpc_service`, `rpc_method`, `rpc_grpc_status_code`, `db_system`, `db_operation_name`, `messaging_system`, `messaging_operation_name`, `error_type`, `otel_scope_name`, `otel_scope_version`, `telemetry_sdk_language`, `span_name`, `span_kind`, `client`, `server`, `connection_type`, `trace_id`, `span_id`, `level`, `detected_level`, `severity_text`, `logger`, `stream`, `filename`

OpenTelemetry attributes appear in their Prometheus-translated form (`service.name` → `service_name`). If your setup keeps UTF-8 names, quote them: `{"service.name"="checkout"}`.

**Metric names**: `up`, `scrape_duration_seconds`, `scrape_samples_scraped`, `ALERTS`, `prometheus_tsdb_head_series`, `prometheus_http_requests_total`, `process_cpu_seconds_total`, `process_resident_memory_bytes`, `process_open_fds`, `process_start_time_seconds`, `go_goroutines`, `go_memstats_heap_inuse_bytes`, `node_cpu_seconds_total`, `node_load1`, `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes`, `node_filesystem_avail_bytes`, `node_filesystem_size_bytes`, `node_disk_io_time_seconds_total`, `node_network_receive_bytes_total`, `node_network_transmit_bytes_total`, `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`, `container_network_receive_bytes_total`, `container_fs_usage_bytes`, `kube_pod_status_phase`, `kube_pod_container_status_restarts_total`, `kube_deployment_status_replicas_available`, `kube_node_status_condition`, `kube_pod_container_resource_requests`, `kube_pod_container_resource_limits`, `http_server_request_duration_seconds`, `http_client_request_duration_seconds`, `rpc_server_duration_milliseconds`, `db_client_operation_duration_seconds`, `target_info`, `traces_spanmetrics_calls_total`, `traces_spanmetrics_latency_bucket`, `traces_service_graph_request_total`, `traces_service_graph_request_failed_total`, `traces_service_graph_request_server_seconds_bucket`

**Terms** (golden signals, RED/USE, SLOs, signal types): `latency`, `traffic`, `errors`, `saturation`, `utilization`, `throughput`, `availability`, `error_budget`, `burn_rate`, `sli`, `slo`, `apdex`, `p50`, `p95`, `p99`, `counter`, `gauge`, `histogram`, `summary`, `cpu`, `memory`, `disk`, `network`, `requests`, `uptime`, `restarts`, `oom`, `queue`, `connections`, `traces`, `spans`, `logs`

Turn any of these groups off or re-rank them with `suggestionCategories`, using the category names `label-name`, `metric` and `monitoring-term`:

```tsx
<PromQLInput suggestionCategories={{ metric: { enabled: false }, 'monitoring-term': { enabled: false } }} />
```

## MetricsQL extensions

With `dialect: 'metricsql'`: `WITH` templates, `keep_metric_names`, and these functions: `histogram_quantiles`, `rollup`, `rollup_rate`, `rollup_deriv`, `rollup_increase`, `rollup_candlestick`, `default_rollup`, `range_avg`, `range_sum`, `range_max`, `range_min`, `range_median`, `running_sum`, `running_avg`, `running_max`, `running_min`, `smooth_exponential`, `share_le_over_time`, `share_gt_over_time`, `median_over_time`, `mode_over_time`, `remove_resets`, `label_set`, `label_del`, `label_keep`, `label_copy`, `label_move`, `label_value`, `label_match`, `label_mismatch`, `drop_common_labels`. See [MetricsQL](./metricsql.md).

## Not supported yet

Prometheus' newest experimental grammar (`fill()` modifiers, `anchored`/`smoothed` ranges, the `</` and `>/` trim operators) is not parsed yet. See the [roadmap](./roadmap.md).
