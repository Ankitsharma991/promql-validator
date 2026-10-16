import { describe, expect, it, vi } from 'vitest';
import { getSuggestions } from '../suggestions/engine.js';
import { extractContext } from '../suggestions/context-extractor.js';
import { AsyncSuggestionController } from '../suggestions/async-controller.js';

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

  it('stays in label-value context and extracts the partial prefix while typing inside a quoted value', () => {
    const query = 'http_requests_total{service="ap';
    const ctx = extractContext(query, query.length);
    expect(ctx.astContext).toBe('label-value');
    expect(ctx.activeLabel).toBe('service');
    expect(ctx.tokenBeforeCursor).toBe('ap');
  });

  it('flips back out of label-value once the quoted value is actually closed', () => {
    const query = 'http_requests_total{service="api"';
    const ctx = extractContext(query, query.length);
    expect(ctx.astContext).not.toBe('label-value');
    expect(ctx.tokenBeforeCursor).toBe('');
  });

  it('handles a cursor mid-way through an in-progress quoted value (not just at the end)', () => {
    const query = 'http_requests_total{service="apx-server"}'; // cursor placed before "-server"
    const cursor = query.indexOf('x-server');
    const ctx = extractContext(query, cursor);
    expect(ctx.astContext).toBe('label-value');
    expect(ctx.tokenBeforeCursor).toBe('ap');
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

describe('AsyncSuggestionController — multi-subscriber support', () => {
  it('notifies every subscriber, not just the most recent one (Part 28.4 shared registry)', async () => {
    vi.useFakeTimers();
    try {
      const provider = vi.fn(async () => [{ label: 'x', value: 'x', category: 'custom' }]);
      const controller = new AsyncSuggestionController({ provider, debounceMs: 10 });

      const listenerA = vi.fn();
      const listenerB = vi.fn();
      controller.subscribe(listenerA);
      controller.subscribe(listenerB);

      controller.request({ query: 'x', cursorPosition: 1, tokenBeforeCursor: 'x', astContext: 'top-level' });
      await vi.advanceTimersByTimeAsync(10);

      expect(listenerA).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
      expect(listenerB).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('unsubscribing one listener does not affect another', async () => {
    vi.useFakeTimers();
    try {
      const provider = vi.fn(async () => [{ label: 'x', value: 'x', category: 'custom' }]);
      const controller = new AsyncSuggestionController({ provider, debounceMs: 10 });

      const listenerA = vi.fn();
      const listenerB = vi.fn();
      const unsubA = controller.subscribe(listenerA);
      controller.subscribe(listenerB);
      unsubA();

      controller.request({ query: 'x', cursorPosition: 1, tokenBeforeCursor: 'x', astContext: 'top-level' });
      await vi.advanceTimersByTimeAsync(10);

      expect(listenerB).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
      // listenerA only ever got its immediate-subscribe idle callback, never the success state.
      expect(listenerA).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('a late subscriber immediately receives the current state, not a stale idle', () => {
    const controller = new AsyncSuggestionController({ provider: async () => [] });
    const late = vi.fn();
    controller.subscribe(late);
    expect(late).toHaveBeenCalledWith(controller.getLastState());
  });
});

describe('built-in call snippets', () => {
  it('gives every function and aggregation suggestion a parenthesised insertText', async () => {
    const { getSuggestions } = await import('../suggestions/engine.js');
    const calls = getSuggestions('', 0).filter((s) => s.category === 'promql-function' || s.category === 'aggregation');
    expect(calls.length).toBeGreaterThan(0);
    for (const s of calls) expect(s.insertText, s.value).toMatch(new RegExp(`^${s.value}\\(`));
    const find = (q: string, v: string) => getSuggestions(q, q.length).find((s) => s.value === v)?.insertText;
    expect(find('absent_over_t', 'absent_over_time')).toBe('absent_over_time($0[5m])');
    expect(find('cei', 'ceil')).toBe('ceil($0)');
    expect(find('su', 'sum')).toBe('sum($0)');
    expect(find('tim', 'time')).toBe('time()$0');
  });
});
