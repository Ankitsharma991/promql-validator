import { describe, expect, it } from 'vitest';
import { indexedLookup, LARGE_SOURCE_THRESHOLD } from '../suggestions/indexing.js';
import { getSuggestions } from '../suggestions/engine.js';

function makeValues(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `service-${String(i).padStart(6, '0')}`);
}

describe('indexedLookup', () => {
  it('returns prefix-matching entries only', () => {
    const values = ['api-a', 'api-b', 'auth-a', 'billing-a'];
    const results = indexedLookup(values, 'custom', 'api');
    expect(results.map((r) => r.value).sort()).toEqual(['api-a', 'api-b']);
  });

  it('returns a bounded, deterministic subset with an empty prefix', () => {
    const values = makeValues(5000);
    const results = indexedLookup(values, 'custom', '', 50);
    expect(results).toHaveLength(50);
    // Sorted alphabetically, so this is deterministic — same input always yields the same subset.
    expect(results[0]!.value).toBe('service-000000');
  });

  it('respects the cap on a large prefix match', () => {
    const values = makeValues(5000); // all share the "service-" prefix
    const results = indexedLookup(values, 'custom', 'service-', 25);
    expect(results).toHaveLength(25);
  });

  it('returns no results for a prefix nothing matches', () => {
    const values = makeValues(1000);
    expect(indexedLookup(values, 'custom', 'zzz-nonexistent')).toEqual([]);
  });

  it('memoizes by array reference — same array instance reuses the built index', () => {
    const values = makeValues(2000);
    const a = indexedLookup(values, 'custom', 'service-000001');
    const b = indexedLookup(values, 'custom', 'service-000001');
    expect(a).toEqual(b);
  });
});

describe('getSuggestions — large dynamic arrays route through indexing transparently', () => {
  it('still finds an exact-prefix match in a 50k-item dynamic group', () => {
    const huge = makeValues(50_000);
    const query = 'http_requests_total{service="service-012345';
    const results = getSuggestions(query, query.length, {
      dynamicSuggestions: [{ category: 'service', values: huge }],
    });
    expect(results.some((r) => r.value === 'service-012345')).toBe(true);
  });

  it('caps results at maxSuggestions for a 50k-item group with no typed prefix', () => {
    const huge = makeValues(50_000);
    const results = getSuggestions('http_requests_total{service=', 29, { dynamicSuggestions: [{ category: 'service', values: huge }] }, { maxSuggestions: 50 });
    expect(results.length).toBeLessThanOrEqual(50);
    expect(huge.length).toBeGreaterThan(LARGE_SOURCE_THRESHOLD);
  });
});
