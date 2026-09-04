import { describe, expect, it } from 'vitest';
import { validatePromQL } from '../validator/validate.js';
import { getQuickFix, getIncompleteBracketFix } from '../validator/quick-fix.js';

function firstDiagnostic(query: string) {
  const result = validatePromQL(query);
  return result.diagnostics[0]!;
}

describe('getIncompleteBracketFix — mid-typing trailing-unclosed brackets', () => {
  it('closes a trailing unclosed paren', () => {
    const query = 'sum(rate(x[5m])';
    const result = validatePromQL(query);
    expect(result.incomplete).toBe(true);
    const fix = getIncompleteBracketFix(result, query);
    expect(fix).not.toBeNull();
    const applied = fix!.apply(query);
    expect(applied.value).toBe('sum(rate(x[5m]))');
    expect(validatePromQL(applied.value)).toMatchObject({ valid: true, incomplete: false });
  });

  it('closes a trailing unclosed brace', () => {
    const query = 'up{job="api"';
    const result = validatePromQL(query);
    expect(result.incomplete).toBe(true);
    const fix = getIncompleteBracketFix(result, query);
    expect(fix!.apply(query).value).toBe('up{job="api"}');
  });

  it('closes a trailing unclosed bracket', () => {
    const query = 'rate(x[5m';
    const result = validatePromQL(query);
    const fix = getIncompleteBracketFix(result, query);
    expect(fix!.apply(query).value).toBe('rate(x[5m]');
  });

  it('closes the innermost of several nested unclosed brackets', () => {
    const query = 'sum(rate(x[5m';
    const result = validatePromQL(query);
    const fix = getIncompleteBracketFix(result, query);
    // innermost unclosed is '[' -> should insert ']', not ')'
    expect(fix!.apply(query).value).toBe('sum(rate(x[5m]');
  });

  it('returns null when the query is not actually incomplete', () => {
    const query = 'up';
    const result = validatePromQL(query);
    expect(getIncompleteBracketFix(result, query)).toBeNull();
  });
});

describe('getQuickFix — diagnostic-anchored fixes', () => {
  it('inserts an empty value for a missing label value, at the correct position', () => {
    const query = 'metric{label=}';
    const diag = firstDiagnostic(query);
    expect(diag.code).toBe('PQ_MISSING_LABEL_VALUE');
    const fix = getQuickFix(diag);
    expect(fix?.label).toMatch(/empty value/i);
    const applied = fix!.apply(query);
    expect(applied.value).toBe('metric{label=""}');
    expect(validatePromQL(applied.value).valid).toBe(true);
  });

  it('handles a missing label value followed by another matcher', () => {
    const query = 'metric{label=,foo="x"}';
    const diag = firstDiagnostic(query);
    const fix = getQuickFix(diag);
    expect(fix!.apply(query).value).toBe('metric{label="",foo="x"}');
  });

  it('adds a unit for a missing-unit duration', () => {
    const query = 'metric[5]';
    const diag = firstDiagnostic(query);
    const fix = getQuickFix(diag);
    const applied = fix!.apply(query);
    expect(applied.value).toBe('metric[5m]');
    expect(validatePromQL(applied.value).valid).toBe(true);
  });

  it('returns null for a genuine bracket-type mismatch (no safe automatic fix)', () => {
    const query = 'rate(x[5m)'; // '[' closed with ')' instead of ']'
    const diag = firstDiagnostic(query);
    expect(diag.code).toBe('PQ_UNCLOSED_BRACKET');
    expect(getQuickFix(diag)).toBeNull();
  });

  it('returns null for diagnostics without a confident automatic fix', () => {
    const query = 'label_replace(up, "a")';
    const diag = firstDiagnostic(query);
    expect(getQuickFix(diag)).toBeNull();
  });

  it('replaces a misspelled function name with the "did you mean" suggestion', () => {
    const query = 'rat(x[5m])';
    const result = validatePromQL(query, { unknownFunctionSeverity: 'error' });
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe('PQ_UNKNOWN_FUNCTION');
    expect(diag.suggestion).toMatch(/rate/);
    const fix = getQuickFix(diag);
    const applied = fix!.apply(query);
    expect(applied.value).toBe('rate(x[5m])');
    expect(validatePromQL(applied.value).valid).toBe(true);
  });
});
