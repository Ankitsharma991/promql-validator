import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validatePromQL } from '../validator/validate.js';

interface Corpus {
  valid: Record<string, string[]>;
  invalid: Record<string, string[]>;
  incomplete: string[];
}

const corpus: Corpus = JSON.parse(readFileSync(new URL('../../conformance/promql.json', import.meta.url), 'utf8'));

describe('PromQL conformance: queries Prometheus accepts', () => {
  for (const [group, queries] of Object.entries(corpus.valid)) {
    it.each(queries)(`${group}: %s`, (q) => {
      const r = validatePromQL(q);
      expect(r.diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
      expect(r).toMatchObject({ valid: true, incomplete: false });
    });
  }
});

describe('PromQL conformance: queries Prometheus rejects', () => {
  for (const [group, queries] of Object.entries(corpus.invalid)) {
    it.each(queries)(`${group}: %s`, (q) => {
      const r = validatePromQL(q);
      expect(r.valid && !r.incomplete).toBe(false);
      expect(r.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    });
  }
});

describe('PromQL conformance: unfinished queries', () => {
  it.each(corpus.incomplete)('%s is incomplete, not an error', (q) => {
    expect(validatePromQL(q)).toEqual({ valid: true, incomplete: true, diagnostics: [] });
  });
});
