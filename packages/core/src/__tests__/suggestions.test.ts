import { describe, expect, it } from 'vitest';
import { getSuggestions } from '../suggestions/engine.js';
import { extractContext } from '../suggestions/context-extractor.js';

describe('extractContext', () => {
  it('classifies top-level at the start of an expression', () => {
    expect(extractContext('', 0).astContext).toBe('top-level');
  });

  it('classifies function-arg inside an open call', () => {
    expect(extractContext('rate(', 5).astContext).toBe('function-arg');
  });

  it('classifies label-name right after an open brace', () => {
    expect(extractContext('http_requests_total{', 21).astContext).toBe('label-name');
  });

  it('classifies label-value after a label operator', () => {
    const ctx = extractContext('http_requests_total{service=', 29);
    expect(ctx.astContext).toBe('label-value');
    expect(ctx.activeLabel).toBe('service');
    expect(ctx.activeMetric).toBe('http_requests_total');
  });

  it('classifies duration inside range brackets', () => {
    expect(extractContext('rate(http_requests_total[', 26).astContext).toBe('duration');
  });

  it('classifies aggregation-grouping inside sum by (...)', () => {
    expect(extractContext('sum by (', 8).astContext).toBe('aggregation-grouping');
  });

  it('classifies operator position after a complete expression', () => {
    expect(extractContext('metric_a ', 9).astContext).toBe('operator');
  });

  it('captures the partial token being typed', () => {
    expect(extractContext('ra', 2).tokenBeforeCursor).toBe('ra');
  });
});

describe('getSuggestions — built-ins', () => {
  it('ranks an exact function match first among top-level candidates', () => {
    const results = getSuggestions('rate', 4);
    expect(results[0]?.value).toBe('rate');
  });

  it('does not suggest PromQL functions inside a label-name position', () => {
    const results = getSuggestions('http_requests_total{', 21);
    expect(results.some((s) => s.category === 'promql-function')).toBe(false);
    expect(results.some((s) => s.category === 'label-name')).toBe(true);
  });

  it('does not suggest label names inside a function-arg position', () => {
    const results = getSuggestions('rate(', 5);
    expect(results.some((s) => s.category === 'label-name')).toBe(false);
    expect(results.some((s) => s.category === 'promql-function')).toBe(true);
  });

  it('offers duration suggestions inside range brackets', () => {
    const results = getSuggestions('rate(x[', 7);
    expect(results.some((s) => s.category === 'duration')).toBe(true);
  });
});

describe('getSuggestions — dynamic suggestions', () => {
  it('surfaces host dynamic values in a matching label-value context, ranked above unrelated built-ins', () => {
    const results = getSuggestions('http_requests_total{service=', 29, {
      dynamicSuggestions: [{ category: 'service', values: ['api-server', 'payment-service', 'auth-service'] }],
    });
    expect(results.slice(0, 3).map((r) => r.value).sort()).toEqual(['api-server', 'auth-service', 'payment-service']);
  });

  it('respects explicit contexts scoping on a dynamic group', () => {
    const results = getSuggestions('http_requests_total{namespace=', 31, {
      dynamicSuggestions: [{ category: 'container', values: ['nginx', 'redis'], contexts: [{ astContext: 'label-value', activeLabel: 'container' }] }],
    });
    expect(results.some((r) => r.value === 'nginx')).toBe(false);
  });
});

describe('getSuggestions — static suggestions and dedup', () => {
  it('accepts shorthand string suggestions', () => {
    const results = getSuggestions('', 0, { suggestions: ['production', 'staging'] });
    expect(results.some((r) => r.value === 'production')).toBe(true);
  });

  it('deduplicates identical (value, category) across sources', () => {
    const results = getSuggestions('rate', 4, {
      suggestions: [{ label: 'rate', value: 'rate', category: 'promql-function' }],
    });
    expect(results.filter((r) => r.value === 'rate' && r.category === 'promql-function').length).toBe(1);
  });
});

describe('getSuggestions — category config', () => {
  it('can disable a built-in category', () => {
    const results = getSuggestions('', 0, { suggestionCategories: { 'monitoring-term': { enabled: false } } });
    expect(results.some((r) => r.category === 'monitoring-term')).toBe(false);
  });
});

describe('getSuggestions — large datasets stay within cap', () => {
  it('caps rendered results at maxSuggestions regardless of candidate count', () => {
    const huge = Array.from({ length: 10_000 }, (_, i) => `pod-${i}`);
    const results = getSuggestions('http_requests_total{pod=', 25, { dynamicSuggestions: [{ category: 'pod', values: huge }] }, { maxSuggestions: 50 });
    expect(results.length).toBeLessThanOrEqual(50);
  });
});
