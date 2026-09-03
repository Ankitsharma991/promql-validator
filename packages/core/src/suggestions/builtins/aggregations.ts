export interface AggregationSpec {
  name: string;
  detail: string;
  description: string;
  /** true when this aggregation takes a leading scalar/string parameter, e.g. topk(k, v) */
  hasParam: boolean;
}

export const PROMQL_AGGREGATIONS: AggregationSpec[] = [
  { name: 'sum', detail: 'sum [by|without (labels)] (v instant-vector)', description: 'Sums the sample values over dimensions.', hasParam: false },
  { name: 'avg', detail: 'avg [by|without (labels)] (v instant-vector)', description: 'Averages the sample values over dimensions.', hasParam: false },
  { name: 'min', detail: 'min [by|without (labels)] (v instant-vector)', description: 'Selects the minimum sample value over dimensions.', hasParam: false },
  { name: 'max', detail: 'max [by|without (labels)] (v instant-vector)', description: 'Selects the maximum sample value over dimensions.', hasParam: false },
  { name: 'count', detail: 'count [by|without (labels)] (v instant-vector)', description: 'Counts the number of elements in the vector over dimensions.', hasParam: false },
  { name: 'count_values', detail: 'count_values("label", v instant-vector)', description: 'Counts the number of elements with the same value, adding a new label with that value.', hasParam: true },
  { name: 'stddev', detail: 'stddev [by|without (labels)] (v instant-vector)', description: 'Calculates the population standard deviation over dimensions.', hasParam: false },
  { name: 'stdvar', detail: 'stdvar [by|without (labels)] (v instant-vector)', description: 'Calculates the population standard variance over dimensions.', hasParam: false },
  { name: 'topk', detail: 'topk(k scalar, v instant-vector)', description: 'Selects the k largest elements by sample value.', hasParam: true },
  { name: 'bottomk', detail: 'bottomk(k scalar, v instant-vector)', description: 'Selects the k smallest elements by sample value.', hasParam: true },
  { name: 'quantile', detail: 'quantile(φ scalar, v instant-vector)', description: 'Calculates the φ-quantile of the sample values over dimensions.', hasParam: true },
  { name: 'group', detail: 'group [by|without (labels)] (v instant-vector)', description: 'Groups series that have common label values; every result has a value of 1.', hasParam: false },
  { name: 'limitk', detail: 'limitk(k scalar, v instant-vector)', description: 'Sample k series from the input, in no particular order.', hasParam: true },
  { name: 'limit_ratio', detail: 'limit_ratio(r scalar, v instant-vector)', description: 'Sample a pseudo-random ratio r of series from the input.', hasParam: true },
];

export const PROMQL_AGGREGATION_NAMES = new Set(PROMQL_AGGREGATIONS.map((a) => a.name));

export function findAggregationSpec(name: string): AggregationSpec | undefined {
  return PROMQL_AGGREGATIONS.find((a) => a.name === name);
}
