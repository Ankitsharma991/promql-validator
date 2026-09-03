export interface OperatorSpec {
  name: string;
  category: 'arithmetic' | 'comparison' | 'logical' | 'modifier';
  detail: string;
  description: string;
}

export const PROMQL_OPERATORS: OperatorSpec[] = [
  { name: '+', category: 'arithmetic', detail: 'addition', description: 'Adds sample values.' },
  { name: '-', category: 'arithmetic', detail: 'subtraction', description: 'Subtracts sample values.' },
  { name: '*', category: 'arithmetic', detail: 'multiplication', description: 'Multiplies sample values.' },
  { name: '/', category: 'arithmetic', detail: 'division', description: 'Divides sample values.' },
  { name: '%', category: 'arithmetic', detail: 'modulo', description: 'Computes the remainder of sample values.' },
  { name: '^', category: 'arithmetic', detail: 'power', description: 'Raises sample values to a power (right-associative).' },
  { name: 'atan2', category: 'arithmetic', detail: 'atan2(y, x)', description: 'Calculates the arc tangent of y/x, element-wise.' },
  { name: '==', category: 'comparison', detail: 'equal', description: 'Filters (or, with `bool`, labels) samples that are equal.' },
  { name: '!=', category: 'comparison', detail: 'not equal', description: 'Filters (or, with `bool`, labels) samples that are not equal.' },
  { name: '>', category: 'comparison', detail: 'greater than', description: 'Filters (or, with `bool`, labels) samples greater than the right-hand side.' },
  { name: '<', category: 'comparison', detail: 'less than', description: 'Filters (or, with `bool`, labels) samples less than the right-hand side.' },
  { name: '>=', category: 'comparison', detail: 'greater than or equal', description: 'Filters (or, with `bool`, labels) samples greater than or equal to the right-hand side.' },
  { name: '<=', category: 'comparison', detail: 'less than or equal', description: 'Filters (or, with `bool`, labels) samples less than or equal to the right-hand side.' },
  { name: 'and', category: 'logical', detail: 'vector1 and vector2', description: 'Set intersection: elements of vector1 with a matching element in vector2.' },
  { name: 'or', category: 'logical', detail: 'vector1 or vector2', description: 'Set union: all elements of vector1, plus elements of vector2 not present in vector1.' },
  { name: 'unless', category: 'logical', detail: 'vector1 unless vector2', description: 'Set complement: elements of vector1 with no matching element in vector2.' },
  { name: 'bool', category: 'modifier', detail: 'bool modifier', description: 'Used after a comparison operator to return 0/1 instead of filtering.' },
  { name: 'by', category: 'modifier', detail: 'by (label, ...)', description: 'Aggregates only over the listed labels.' },
  { name: 'without', category: 'modifier', detail: 'without (label, ...)', description: 'Aggregates over all labels except the listed ones.' },
  { name: 'on', category: 'modifier', detail: 'on (label, ...)', description: 'Restricts vector matching to the listed labels.' },
  { name: 'ignoring', category: 'modifier', detail: 'ignoring (label, ...)', description: 'Excludes the listed labels from vector matching.' },
  { name: 'group_left', category: 'modifier', detail: 'group_left(labels)', description: 'Many-to-one vector matching: right side has multiple matches per left series.' },
  { name: 'group_right', category: 'modifier', detail: 'group_right(labels)', description: 'One-to-many vector matching: left side has multiple matches per right series.' },
  { name: 'offset', category: 'modifier', detail: 'offset 5m', description: 'Shifts the evaluation time of a selector into the past.' },
];

export const DURATION_UNIT_SUGGESTIONS = ['ns', 'us', 'ms', 's', 'm', 'h', 'd', 'w', 'y'];

export const COMMON_DURATIONS = ['15s', '30s', '1m', '5m', '10m', '15m', '30m', '1h', '3h', '6h', '12h', '1d', '2d', '7d'];
