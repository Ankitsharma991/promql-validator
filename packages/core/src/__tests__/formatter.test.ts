import { describe, expect, it } from 'vitest';
import { formatPromQL, PromQLFormatError } from '../formatter/format.js';

const corpus = [
  'rate(http_requests_total[5m])',
  'sum by (service) (rate(http_requests_total[5m]))',
  'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
  'up{job="api"} == 0',
  'a + on(job) group_left(version) b',
  'topk(5, sum by (instance) (rate(http_requests_total[5m])))',
];

describe('formatPromQL — idempotency', () => {
  for (const q of corpus) {
    it(`format(format(x)) === format(x) for: ${q}`, () => {
      const once = formatPromQL(q);
      const twice = formatPromQL(once);
      expect(twice).toBe(once);
    });
  }
});

describe('formatPromQL — semantic preservation (spot checks)', () => {
  it('preserves label matchers', () => {
    expect(formatPromQL('up{job="api",instance="a:9090"}')).toContain('job="api"');
    expect(formatPromQL('up{job="api",instance="a:9090"}')).toContain('instance="a:9090"');
  });

  it('preserves duration text', () => {
    expect(formatPromQL('rate(x[5m])')).toContain('[5m]');
  });
});

describe('formatPromQL — errors', () => {
  it('throws PromQLFormatError on unparseable input rather than guessing', () => {
    expect(() => formatPromQL('rate(http_requests_total[5m)')).toThrow(PromQLFormatError);
  });

  it('throws on incomplete input', () => {
    expect(() => formatPromQL('rate(')).toThrow(PromQLFormatError);
  });

  it('returns empty/whitespace input unchanged', () => {
    expect(formatPromQL('')).toBe('');
    expect(formatPromQL('   ')).toBe('   ');
  });
});

describe('formatPromQL — line breaking', () => {
  it('breaks a long aggregation onto multiple lines', () => {
    const long = 'sum by (service, namespace, cluster, region, environment) (rate(http_requests_total{service="api"}[5m]))';
    const formatted = formatPromQL(long, { maxInlineWidth: 80 });
    expect(formatted).toContain('\n');
  });

  it('keeps short expressions single-line', () => {
    const formatted = formatPromQL('rate(x[5m])');
    expect(formatted).not.toContain('\n');
  });
});
