import { describe, expect, it } from 'vitest';
import { isMetricNameSuggestion, isRangeVectorArgSlot } from '../range-slot.js';

// `|` marks the slot: the partial token being completed spans from `|` to the end of the word.
function slot(template: string) {
  const start = template.indexOf('|');
  const value = template.replace('|', '');
  let end = start;
  while (end < value.length && /[\w:]/.test(value[end]!)) end++;
  return isRangeVectorArgSlot(value, start, end);
}

describe('isRangeVectorArgSlot', () => {
  it.each(['rate(|)', 'rate(|http)', 'sum(rate(|))', 'quantile_over_time(0.9, |)', 'predict_linear(|, 3600)', 'rate( |)', 'rate(|'])('%s → true', (t) => {
    expect(slot(t)).toBe(true);
  });

  it.each(['ceil(|)', 'histogram_quantile(0.9, |)', 'quantile_over_time(|)', 'predict_linear(up[5m], |)', 'rate(up + |)', 'rate(|{job="a"})', 'rate(|[5m])', '|', 'rate(up{job=|})', 'sum by (|)'])('%s → false', (t) => {
    expect(slot(t)).toBe(false);
  });
});

describe('isMetricNameSuggestion', () => {
  it('accepts metric-like suggestions and rejects functions, keywords and values', () => {
    expect(isMetricNameSuggestion({ label: 'up', value: 'up', category: 'metric' })).toBe(true);
    expect(isMetricNameSuggestion({ label: 'node:cpu:rate5m', value: 'node:cpu:rate5m' })).toBe(true);
    expect(isMetricNameSuggestion({ label: 'rate', value: 'rate', category: 'promql-function', insertText: 'rate($0)' })).toBe(false);
    expect(isMetricNameSuggestion({ label: 'job', value: 'job', category: 'label-name' })).toBe(false);
    expect(isMetricNameSuggestion({ label: 'api-server', value: 'api-server', category: 'job' })).toBe(false);
  });
});
