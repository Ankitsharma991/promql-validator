import { describe, expect, it } from 'vitest';
import { validatePromQL } from '../validator/validate.js';
import { expandWithTemplates } from '../dialects/with-templates.js';

describe('expandWithTemplates', () => {
  it('leaves a query with no WITH block untouched', () => {
    const result = expandWithTemplates('rate(x[5m])');
    expect(result.hadWith).toBe(false);
    expect(result.expanded).toBe('rate(x[5m])');
  });

  it('substitutes a single named template into the body', () => {
    const result = expandWithTemplates('WITH (commonFilter = {job="api"}) up{commonFilter}');
    expect(result.hadWith).toBe(true);
    expect(result.diagnostics).toEqual([]);
    // A brace-filter template reference splices into the surrounding {}, rather than
    // nesting braces-in-parens-in-braces (which would be invalid syntax).
    expect(result.expanded.trim()).toBe('up{job="api"}');
    expect(validatePromQL(result.expanded).valid).toBe(true);
  });

  it('substitutes multiple templates, including a template referencing an earlier one', () => {
    const result = expandWithTemplates('WITH (svc = "api", filter = {service=svc}) up{filter}');
    expect(result.expanded).toContain('service=("api")');
  });

  it('allows the substituted result to validate as valid PromQL after full expansion', () => {
    // A realistic case: naming a duration and reusing it.
    const result = expandWithTemplates('WITH (r = rate(http_requests_total[5m])) sum(r)');
    expect(result.diagnostics).toEqual([]);
    const validated = validatePromQL(result.expanded);
    expect(validated.valid).toBe(true);
  });

  it('reports a diagnostic for a missing opening paren after WITH', () => {
    const result = expandWithTemplates('WITH x = 1 up');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('reports a diagnostic for an unclosed WITH header', () => {
    const result = expandWithTemplates('WITH (x = 1 up');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('never throws on malformed WITH input', () => {
    expect(() => expandWithTemplates('WITH (' + '('.repeat(50))).not.toThrow();
    expect(() => expandWithTemplates('WITH ()')).not.toThrow();
    expect(() => expandWithTemplates('WITH')).not.toThrow();
  });
});

describe('validatePromQL — dialect: metricsql', () => {
  it('expands and validates a WITH-templated query end to end', () => {
    const result = validatePromQL('WITH (f = {job="api"}) up{f}', { dialect: 'metricsql' });
    expect(result.valid).toBe(true);
  });

  it('accepts a known MetricsQL-only function', () => {
    const result = validatePromQL('rollup_rate(x[5m])', { dialect: 'metricsql', unknownFunctionSeverity: 'error' });
    expect(result.valid).toBe(true);
  });

  it('rejects the same MetricsQL-only function under the promql dialect (strict superset, not equivalence)', () => {
    const result = validatePromQL('rollup_rate(x[5m])', { dialect: 'promql', unknownFunctionSeverity: 'error' });
    expect(result.valid).toBe(false);
  });

  it('enforces arity for a MetricsQL extension function', () => {
    const result = validatePromQL('histogram_quantiles("phi", 0.5)', { dialect: 'metricsql' });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'PQ_WRONG_ARITY')).toBe(true);
  });

  it('tolerates a trailing keep_metric_names modifier', () => {
    const result = validatePromQL('rate(x[5m]) keep_metric_names', { dialect: 'metricsql' });
    expect(result.valid).toBe(true);
  });

  it('rejects keep_metric_names as unexpected trailing input under the promql dialect', () => {
    const result = validatePromQL('rate(x[5m]) keep_metric_names', { dialect: 'promql' });
    expect(result.valid).toBe(false);
  });

  it('surfaces a WITH-header syntax error as a real diagnostic, not a crash', () => {
    const result = validatePromQL('WITH (x = ) up', { dialect: 'metricsql' });
    expect(() => result).not.toThrow();
    // whether this is caught as a WITH-header issue or downstream, it must not be reported valid
    expect(result.valid).toBe(false);
  });

  it('still applies custom validators and customFunctions under metricsql', () => {
    const result = validatePromQL('my_custom_func(x)', { dialect: 'metricsql', unknownFunctionSeverity: 'error', customFunctions: ['my_custom_func'] });
    expect(result.valid).toBe(true);
  });
});
