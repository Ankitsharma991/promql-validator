import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '@promql-validator/core';
import { buildHighlightSegments, matchIndices } from '../highlight.js';

const kinds = (value: string) => buildHighlightSegments(value).filter((s) => s.text.trim()).map((s) => [s.text, s.kind]);

describe('buildHighlightSegments', () => {
  it('reproduces the input text exactly', () => {
    const q = 'sum by (job) (rate(http_requests_total{code=~"5.."}[5m])) / 2 # note';
    expect(buildHighlightSegments(q).map((s) => s.text).join('')).toBe(q);
  });

  it('classifies functions, metrics, label names, strings and durations', () => {
    expect(kinds('rate(http_requests_total{job="api"}[5m])')).toEqual([
      ['rate', 'function'],
      ['(', 'punctuation'],
      ['http_requests_total', 'metric'],
      ['{', 'punctuation'],
      ['job', 'label'],
      ['=', 'operator'],
      ['"api"', 'string'],
      ['}', 'punctuation'],
      ['[', 'punctuation'],
      ['5m', 'duration'],
      [']', 'punctuation'],
      [')', 'punctuation'],
    ]);
  });

  it('treats identifiers in by/without/on lists as label names', () => {
    const out = kinds('sum without (instance, pod) (up)');
    expect(out).toContainEqual(['without', 'keyword']);
    expect(out).toContainEqual(['instance', 'label']);
    expect(out).toContainEqual(['pod', 'label']);
    expect(out).toContainEqual(['up', 'metric']);
  });

  it('styles # comments', () => {
    expect(kinds('up # hello')).toContainEqual(['# hello', 'comment']);
  });

  it('marks diagnostic ranges with the highest overlapping severity', () => {
    const diag = (start: number, end: number, severity: Diagnostic['severity']): Diagnostic => ({ start, end, severity, message: '', code: 'x', line: 1, column: start + 1 });
    const segs = buildHighlightSegments('foo(bar)', [diag(0, 3, 'warning'), diag(1, 2, 'error')]);
    expect(segs.map((s) => [s.text, s.severity])).toEqual([
      ['f', 'warning'],
      ['o', 'error'],
      ['o', 'warning'],
      ['(', undefined],
      ['bar', undefined],
      [')', undefined],
    ]);
  });

  it('widens zero-width diagnostics at end of input to the last character', () => {
    const segs = buildHighlightSegments('rate(', [{ start: 5, end: 5, severity: 'error', message: '', code: 'x', line: 1, column: 6 }]);
    expect(segs.at(-1)).toMatchObject({ text: '(', severity: 'error' });
  });
});

describe('matchIndices', () => {
  it('prefers a contiguous case-insensitive match', () => {
    expect(matchIndices('http_requests_total', 'REQ')).toEqual([5, 6, 7]);
  });
  it('falls back to an in-order fuzzy match', () => {
    expect(matchIndices('histogram_quantile', 'hq')).toEqual([0, 10]);
  });
  it('returns nothing when the needle does not match', () => {
    expect(matchIndices('rate', 'xyz')).toEqual([]);
    expect(matchIndices('rate', '')).toEqual([]);
  });
});
