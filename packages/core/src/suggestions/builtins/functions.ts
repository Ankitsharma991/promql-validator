export interface FunctionSpec {
  name: string;
  /** minimum required argument count */
  minArgs: number;
  /** maximum allowed argument count (Infinity for variadic) */
  maxArgs: number;
  /** true when the function's first (or only) vector argument must be a range vector, e.g. rate(v[5m]) */
  rangeVectorArg?: boolean;
  detail: string;
  description: string;
  insertText?: string;
}

// Reference: Prometheus stable query function list. Dictionary schema version tracked
// independently of package semver in CHANGELOG-GRAMMAR.md (see PRD Part 13.3).
export const PROMQL_FUNCTIONS: FunctionSpec[] = [
  { name: 'abs', minArgs: 1, maxArgs: 1, detail: 'abs(v instant-vector)', description: 'Returns the input vector with all sample values converted to their absolute value.' },
  { name: 'absent', minArgs: 1, maxArgs: 1, detail: 'absent(v instant-vector)', description: 'Returns an empty vector if the input vector has elements, and a 1-element vector with the value 1 if it has no elements.' },
  { name: 'absent_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'absent_over_time(v range-vector)', description: 'Returns a 1-element vector with the value 1 if the range vector passed has no elements.' },
  { name: 'ceil', minArgs: 1, maxArgs: 1, detail: 'ceil(v instant-vector)', description: 'Rounds the sample values up to the nearest integer.' },
  { name: 'changes', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'changes(v range-vector)', description: 'Returns the number of times its value changed within the provided time range.' },
  { name: 'clamp', minArgs: 3, maxArgs: 3, detail: 'clamp(v instant-vector, min scalar, max scalar)', description: 'Clamps the sample values to a specified minimum and maximum.' },
  { name: 'clamp_max', minArgs: 2, maxArgs: 2, detail: 'clamp_max(v instant-vector, max scalar)', description: 'Clamps the sample values to a specified maximum.' },
  { name: 'clamp_min', minArgs: 2, maxArgs: 2, detail: 'clamp_min(v instant-vector, min scalar)', description: 'Clamps the sample values to a specified minimum.' },
  { name: 'day_of_month', minArgs: 0, maxArgs: 1, detail: 'day_of_month(v=vector(time()) instant-vector)', description: 'Returns the day of the month for each of the given times in UTC.' },
  { name: 'day_of_week', minArgs: 0, maxArgs: 1, detail: 'day_of_week(v=vector(time()) instant-vector)', description: 'Returns the day of the week for each of the given times in UTC.' },
  { name: 'day_of_year', minArgs: 0, maxArgs: 1, detail: 'day_of_year(v=vector(time()) instant-vector)', description: 'Returns the day of the year for each of the given times in UTC.' },
  { name: 'days_in_month', minArgs: 0, maxArgs: 1, detail: 'days_in_month(v=vector(time()) instant-vector)', description: 'Returns the number of days in the month for each of the given times in UTC.' },
  { name: 'delta', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'delta(v range-vector)', description: 'Calculates the difference between the first and last value of each time series in a range vector.' },
  { name: 'deriv', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'deriv(v range-vector)', description: 'Calculates the per-second derivative of the time series using simple linear regression.' },
  { name: 'exp', minArgs: 1, maxArgs: 1, detail: 'exp(v instant-vector)', description: 'Calculates the exponential function for all elements in v.' },
  { name: 'floor', minArgs: 1, maxArgs: 1, detail: 'floor(v instant-vector)', description: 'Rounds the sample values down to the nearest integer.' },
  { name: 'histogram_avg', minArgs: 1, maxArgs: 1, detail: 'histogram_avg(v instant-vector)', description: 'Returns the arithmetic average of observed values stored in a native histogram.' },
  { name: 'histogram_count', minArgs: 1, maxArgs: 1, detail: 'histogram_count(v instant-vector)', description: 'Returns the count of observations stored in a native histogram.' },
  { name: 'histogram_fraction', minArgs: 3, maxArgs: 3, detail: 'histogram_fraction(lower scalar, upper scalar, v instant-vector)', description: 'Returns the estimated fraction of observations between the provided bounds in a native histogram.' },
  { name: 'histogram_quantile', minArgs: 2, maxArgs: 2, detail: 'histogram_quantile(φ scalar, b instant-vector)', description: 'Calculates the φ-quantile from a conventional or native histogram.', insertText: 'histogram_quantile(0.95, $0)' },
  { name: 'histogram_stddev', minArgs: 1, maxArgs: 1, detail: 'histogram_stddev(v instant-vector)', description: 'Returns the estimated standard deviation of observations in a native histogram.' },
  { name: 'histogram_stdvar', minArgs: 1, maxArgs: 1, detail: 'histogram_stdvar(v instant-vector)', description: 'Returns the estimated standard variance of observations in a native histogram.' },
  { name: 'histogram_sum', minArgs: 1, maxArgs: 1, detail: 'histogram_sum(v instant-vector)', description: 'Returns the sum of observations stored in a native histogram.' },
  { name: 'holt_winters', minArgs: 3, maxArgs: 3, rangeVectorArg: true, detail: 'holt_winters(v range-vector, sf scalar, tf scalar)', description: 'Produces a smoothed value for time series based on the range in v (double exponential smoothing).' },
  { name: 'double_exponential_smoothing', minArgs: 3, maxArgs: 3, rangeVectorArg: true, detail: 'double_exponential_smoothing(v range-vector, sf scalar, tf scalar)', description: 'Produces a smoothed value for time series based on the range in v.' },
  { name: 'hour', minArgs: 0, maxArgs: 1, detail: 'hour(v=vector(time()) instant-vector)', description: 'Returns the hour of the day for each of the given times in UTC.' },
  { name: 'idelta', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'idelta(v range-vector)', description: 'Calculates the difference between the last two samples in the range vector.' },
  { name: 'increase', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'increase(v range-vector)', description: 'Calculates the increase in the time series over a range, extrapolated to cover the full range.', insertText: 'increase($0[5m])' },
  { name: 'info', minArgs: 1, maxArgs: 2, detail: 'info(v instant-vector, [dataLabelSelector instant-vector])', description: 'Finds related info metric series and adds their identifying labels to the results.' },
  { name: 'irate', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'irate(v range-vector)', description: 'Calculates the per-second instant rate of increase using the last two data points.', insertText: 'irate($0[5m])' },
  { name: 'label_join', minArgs: 4, maxArgs: Infinity, detail: 'label_join(v instant-vector, dst_label, separator, src_label_1, ...)', description: 'Joins values of several source labels into a destination label using a separator.' },
  { name: 'label_replace', minArgs: 5, maxArgs: 5, detail: 'label_replace(v instant-vector, dst_label, replacement, src_label, regex)', description: 'Matches a regex against a source label and replaces/creates a destination label.' },
  { name: 'ln', minArgs: 1, maxArgs: 1, detail: 'ln(v instant-vector)', description: 'Calculates the natural logarithm for all elements in v.' },
  { name: 'log2', minArgs: 1, maxArgs: 1, detail: 'log2(v instant-vector)', description: 'Calculates the binary logarithm for all elements in v.' },
  { name: 'log10', minArgs: 1, maxArgs: 1, detail: 'log10(v instant-vector)', description: 'Calculates the decimal logarithm for all elements in v.' },
  { name: 'mad_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'mad_over_time(v range-vector)', description: 'The median absolute deviation of all points in the specified range.' },
  { name: 'minute', minArgs: 0, maxArgs: 1, detail: 'minute(v=vector(time()) instant-vector)', description: 'Returns the minute of the hour for each of the given times in UTC.' },
  { name: 'month', minArgs: 0, maxArgs: 1, detail: 'month(v=vector(time()) instant-vector)', description: 'Returns the month of the year for each of the given times in UTC.' },
  { name: 'predict_linear', minArgs: 2, maxArgs: 2, rangeVectorArg: true, detail: 'predict_linear(v range-vector, t scalar)', description: 'Predicts the value of a time series t seconds from now, based on simple linear regression.' },
  { name: 'rate', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'rate(v range-vector)', description: 'Calculates the per-second average rate of increase of a counter over a range.', insertText: 'rate($0[5m])' },
  { name: 'resets', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'resets(v range-vector)', description: 'Returns the number of counter resets within the provided time range.' },
  { name: 'round', minArgs: 1, maxArgs: 2, detail: 'round(v instant-vector, to_nearest=1 scalar)', description: 'Rounds sample values to the nearest integer, or to the nearest multiple of to_nearest.' },
  { name: 'scalar', minArgs: 1, maxArgs: 1, detail: 'scalar(v instant-vector)', description: "Given a single-element input vector, returns the sample value as a scalar. Returns NaN otherwise." },
  { name: 'sgn', minArgs: 1, maxArgs: 1, detail: 'sgn(v instant-vector)', description: 'Returns -1, 0, or 1 depending on the sign of the sample values.' },
  { name: 'sort', minArgs: 1, maxArgs: 1, detail: 'sort(v instant-vector)', description: 'Returns the elements of v sorted by their sample values, ascending.' },
  { name: 'sort_desc', minArgs: 1, maxArgs: 1, detail: 'sort_desc(v instant-vector)', description: 'Returns the elements of v sorted by their sample values, descending.' },
  { name: 'sort_by_label', minArgs: 2, maxArgs: Infinity, detail: 'sort_by_label(v instant-vector, label, ...)', description: 'Returns elements of v sorted by their label values, ascending.' },
  { name: 'sort_by_label_desc', minArgs: 2, maxArgs: Infinity, detail: 'sort_by_label_desc(v instant-vector, label, ...)', description: 'Returns elements of v sorted by their label values, descending.' },
  { name: 'sqrt', minArgs: 1, maxArgs: 1, detail: 'sqrt(v instant-vector)', description: 'Calculates the square root of all elements in v.' },
  { name: 'time', minArgs: 0, maxArgs: 0, detail: 'time()', description: 'Returns the number of seconds since January 1, 1970 UTC.' },
  { name: 'timestamp', minArgs: 1, maxArgs: 1, detail: 'timestamp(v instant-vector)', description: "Returns the timestamp of each of the samples of the given vector as the number of seconds since epoch." },
  { name: 'vector', minArgs: 1, maxArgs: 1, detail: 'vector(s scalar)', description: 'Returns the scalar s as a vector with no labels.' },
  { name: 'year', minArgs: 0, maxArgs: 1, detail: 'year(v=vector(time()) instant-vector)', description: 'Returns the year for each of the given times in UTC.' },
  { name: 'pi', minArgs: 0, maxArgs: 0, detail: 'pi()', description: 'Returns the constant pi.' },
  { name: 'deg', minArgs: 1, maxArgs: 1, detail: 'deg(v instant-vector)', description: 'Converts radians to degrees for all elements in v.' },
  { name: 'rad', minArgs: 1, maxArgs: 1, detail: 'rad(v instant-vector)', description: 'Converts degrees to radians for all elements in v.' },
  { name: 'sin', minArgs: 1, maxArgs: 1, detail: 'sin(v instant-vector)', description: 'Calculates the sine of all elements in v.' },
  { name: 'cos', minArgs: 1, maxArgs: 1, detail: 'cos(v instant-vector)', description: 'Calculates the cosine of all elements in v.' },
  { name: 'tan', minArgs: 1, maxArgs: 1, detail: 'tan(v instant-vector)', description: 'Calculates the tangent of all elements in v.' },
  { name: 'asin', minArgs: 1, maxArgs: 1, detail: 'asin(v instant-vector)', description: 'Calculates the arcsine of all elements in v.' },
  { name: 'acos', minArgs: 1, maxArgs: 1, detail: 'acos(v instant-vector)', description: 'Calculates the arccosine of all elements in v.' },
  { name: 'atan', minArgs: 1, maxArgs: 1, detail: 'atan(v instant-vector)', description: 'Calculates the arctangent of all elements in v.' },
  { name: 'sinh', minArgs: 1, maxArgs: 1, detail: 'sinh(v instant-vector)', description: 'Calculates the hyperbolic sine of all elements in v.' },
  { name: 'cosh', minArgs: 1, maxArgs: 1, detail: 'cosh(v instant-vector)', description: 'Calculates the hyperbolic cosine of all elements in v.' },
  { name: 'tanh', minArgs: 1, maxArgs: 1, detail: 'tanh(v instant-vector)', description: 'Calculates the hyperbolic tangent of all elements in v.' },
  { name: 'asinh', minArgs: 1, maxArgs: 1, detail: 'asinh(v instant-vector)', description: 'Calculates the inverse hyperbolic sine of all elements in v.' },
  { name: 'acosh', minArgs: 1, maxArgs: 1, detail: 'acosh(v instant-vector)', description: 'Calculates the inverse hyperbolic cosine of all elements in v.' },
  { name: 'atanh', minArgs: 1, maxArgs: 1, detail: 'atanh(v instant-vector)', description: 'Calculates the inverse hyperbolic tangent of all elements in v.' },

  // *_over_time family
  { name: 'avg_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'avg_over_time(v range-vector)', description: 'The average value of all points in the specified range.', insertText: 'avg_over_time($0[5m])' },
  { name: 'min_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'min_over_time(v range-vector)', description: 'The minimum value of all points in the specified range.' },
  { name: 'max_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'max_over_time(v range-vector)', description: 'The maximum value of all points in the specified range.' },
  { name: 'sum_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'sum_over_time(v range-vector)', description: 'The sum of all values in the specified range.' },
  { name: 'count_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'count_over_time(v range-vector)', description: 'The count of all values in the specified range.' },
  { name: 'quantile_over_time', minArgs: 2, maxArgs: 2, rangeVectorArg: true, detail: 'quantile_over_time(φ scalar, v range-vector)', description: 'The φ-quantile of all values in the specified range.' },
  { name: 'stddev_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'stddev_over_time(v range-vector)', description: 'The population standard deviation of the values in the specified range.' },
  { name: 'stdvar_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'stdvar_over_time(v range-vector)', description: 'The population standard variance of the values in the specified range.' },
  { name: 'last_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'last_over_time(v range-vector)', description: 'The most recent point value in the specified range.' },
  { name: 'present_over_time', minArgs: 1, maxArgs: 1, rangeVectorArg: true, detail: 'present_over_time(v range-vector)', description: 'The value 1 for any series in the specified range that has a present value.' },
];

export const PROMQL_FUNCTION_NAMES = new Set(PROMQL_FUNCTIONS.map((f) => f.name));

export function findFunctionSpec(name: string): FunctionSpec | undefined {
  return PROMQL_FUNCTIONS.find((f) => f.name === name);
}
