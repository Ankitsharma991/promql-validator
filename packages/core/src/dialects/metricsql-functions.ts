import type { FunctionSpec } from '../suggestions/builtins/functions.js';

/**
 * MetricsQL (VictoriaMetrics' PromQL superset) function extensions beyond stable Prometheus
 * PromQL. This is a **conservative, best-effort subset** of the well-documented, widely-used
 * additions — not a verified-against-live-documentation exhaustive list (VictoriaMetrics
 * ships on the order of 100 MetricsQL-specific functions, and this package has no live
 * access to cross-check every signature). Per this project's correctness-first principle,
 * we'd rather under-cover a dialect than fabricate function signatures we can't verify:
 * an *unrecognized* MetricsQL function still degrades gracefully to a warning (same
 * `unknownFunctionSeverity` mechanism as PromQL, Part 13.2), never a hard failure — so a gap
 * here is a missing autocomplete/arity-check entry, not a false validation error.
 * Corrections and additions are welcome (see CONTRIBUTING.md).
 */
export const METRICSQL_FUNCTIONS: FunctionSpec[] = [
  { name: 'histogram_quantiles', minArgs: 4, maxArgs: Infinity, detail: 'histogram_quantiles("phiLabel", phi1, phi2, ..., buckets)', description: 'Calculates the given list of φ-quantiles over a histogram in one call, labeling each result.' },
  { name: 'rollup', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'rollup(v range-vector)', description: 'Returns min, max, and avg values for the given range (MetricsQL rollup function).' },
  { name: 'rollup_rate', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'rollup_rate(v range-vector)', description: 'Like rate(), but returns min/max/avg rates for the given range.' },
  { name: 'rollup_deriv', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'rollup_deriv(v range-vector)', description: 'Returns min/max/avg of the per-second derivative for the given range.' },
  { name: 'rollup_increase', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'rollup_increase(v range-vector)', description: 'Returns min/max/avg of the increase for the given range.' },
  { name: 'rollup_candlestick', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'rollup_candlestick(v range-vector)', description: 'Returns open/high/low/close values for the given range — useful for candlestick charts.' },
  { name: 'default_rollup', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'default_rollup(v range-vector)', description: "Returns the last raw value for the given range (MetricsQL's default rollup function)." },
  { name: 'range_avg', minArgs: 1, maxArgs: 1, detail: 'range_avg(v instant-vector)', description: 'The average value across the whole selected time range for each series.' },
  { name: 'range_sum', minArgs: 1, maxArgs: 1, detail: 'range_sum(v instant-vector)', description: 'The sum of values across the whole selected time range for each series.' },
  { name: 'range_max', minArgs: 1, maxArgs: 1, detail: 'range_max(v instant-vector)', description: 'The maximum value across the whole selected time range for each series.' },
  { name: 'range_min', minArgs: 1, maxArgs: 1, detail: 'range_min(v instant-vector)', description: 'The minimum value across the whole selected time range for each series.' },
  { name: 'range_median', minArgs: 1, maxArgs: 1, detail: 'range_median(v instant-vector)', description: 'The median value across the whole selected time range for each series.' },
  { name: 'running_sum', minArgs: 1, maxArgs: 1, detail: 'running_sum(v instant-vector)', description: 'A running sum per series over the selected time range.' },
  { name: 'running_avg', minArgs: 1, maxArgs: 1, detail: 'running_avg(v instant-vector)', description: 'A running average per series over the selected time range.' },
  { name: 'running_max', minArgs: 1, maxArgs: 1, detail: 'running_max(v instant-vector)', description: 'A running maximum per series over the selected time range.' },
  { name: 'running_min', minArgs: 1, maxArgs: 1, detail: 'running_min(v instant-vector)', description: 'A running minimum per series over the selected time range.' },
  { name: 'smooth_exponential', minArgs: 2, maxArgs: 2, detail: 'smooth_exponential(v instant-vector, sf scalar)', description: 'Smooths values using exponential smoothing with the given smoothing factor.' },
  { name: 'share_le_over_time', minArgs: 2, maxArgs: 2, rangeVectorArg: true, detail: 'share_le_over_time(v range-vector, le scalar)', description: 'The share of points in the range that are <= le.' },
  { name: 'share_gt_over_time', minArgs: 2, maxArgs: 2, rangeVectorArg: true, detail: 'share_gt_over_time(v range-vector, gt scalar)', description: 'The share of points in the range that are > gt.' },
  { name: 'median_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'median_over_time(v range-vector)', description: 'The median value over the specified range.' },
  { name: 'mode_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'mode_over_time(v range-vector)', description: 'The most frequently occurring value over the specified range.' },
  { name: 'remove_resets', minArgs: 1, maxArgs: 1, detail: 'remove_resets(v instant-vector)', description: 'Removes counter-reset artifacts from the input series.' },
  { name: 'label_set', minArgs: 3, maxArgs: Infinity, detail: 'label_set(v, label1, value1, ...)', description: 'Sets the given label(s) to the given value(s) on every output series.' },
  { name: 'label_del', minArgs: 2, maxArgs: Infinity, detail: 'label_del(v, label1, ...)', description: 'Deletes the given label(s) from every output series.' },
  { name: 'label_keep', minArgs: 2, maxArgs: Infinity, detail: 'label_keep(v, label1, ...)', description: 'Keeps only the given label(s) (plus __name__) on every output series.' },
  { name: 'label_copy', minArgs: 3, maxArgs: Infinity, detail: 'label_copy(v, src1, dst1, ...)', description: 'Copies label values from source labels to destination labels.' },
  { name: 'label_move', minArgs: 3, maxArgs: Infinity, detail: 'label_move(v, src1, dst1, ...)', description: 'Moves (renames) label values from source labels to destination labels.' },
  { name: 'label_value', minArgs: 2, maxArgs: 2, detail: 'label_value(v, label)', description: "Returns the numeric value of the given label, parsed as a float, as each series' sample value." },
  { name: 'label_match', minArgs: 3, maxArgs: 3, detail: 'label_match(v, label, regex)', description: 'Keeps only series whose label value matches the given regex.' },
  { name: 'label_mismatch', minArgs: 3, maxArgs: 3, detail: 'label_mismatch(v, label, regex)', description: "Keeps only series whose label value doesn't match the given regex." },
  { name: 'drop_common_labels', minArgs: 1, maxArgs: 1, detail: 'drop_common_labels(v instant-vector)', description: 'Drops labels that have the same value across all the input series.' },
];

export const METRICSQL_FUNCTION_NAMES = new Set(METRICSQL_FUNCTIONS.map((f) => f.name));
