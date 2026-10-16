import { describe, expect, it } from 'vitest';
import { validatePromQL, UnsupportedDialectError } from '../validator/validate.js';
import { DiagnosticCode } from '../validator/diagnostics.js';

describe('validatePromQL — valid queries', () => {
  const valid = [
    'rate(http_requests_total[5m])',
    'sum by (service) (rate(http_requests_total[5m]))',
    'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
    'sum(rate(a[5m])) / sum(rate(b[5m]))',
    'up{job="api"} == 0',
    'avg_over_time(cpu_usage[5m:1m])',
    'sum(rate(errors[5m])) unless sum(rate(baseline[5m]))',
    'node_cpu_seconds_total{mode!="idle"}',
    'topk(5, sum by (instance) (rate(http_requests_total[5m])))',
    'label_replace(up, "host", "$1", "instance", "(.*):.*")',
    '1 + 1',
    '-rate(a[5m])',
    'a + on(job) group_left(version) b',
    'metric offset 5m',
    'metric @ 1609746000',
    '{job="api"}',
    'count_values("version", build_info)',
  ];

  for (const q of valid) {
    it(`accepts: ${q}`, () => {
      const result = validatePromQL(q);
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }
});

describe('validatePromQL — invalid queries', () => {
  it('flags an unclosed bracket', () => {
    const result = validatePromQL('rate(http_requests_total[5m)');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === DiagnosticCode.UnclosedBracket)).toBe(true);
  });

  it('flags a wrong-arg-type range vector error', () => {
    const result = validatePromQL('rate(http_requests_total)');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === DiagnosticCode.WrongArgType)).toBe(true);
  });

  it('flags a missing label value', () => {
    const result = validatePromQL('metric{label=}');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === DiagnosticCode.MissingLabelValue)).toBe(true);
  });

  it('accepts a plain number of seconds as a duration, like Prometheus', () => {
    expect(validatePromQL('metric[300]')).toEqual({ valid: true, incomplete: false, diagnostics: [] });
  });

  it('flags a duration whose units are out of order', () => {
    const result = validatePromQL('metric[5m1h]');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === DiagnosticCode.InvalidDuration)).toBe(true);
  });

  it('flags conflicting by/without modifiers', () => {
    const result = validatePromQL('sum by (a) without (b) (x)');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === DiagnosticCode.ConflictingModifiers)).toBe(true);
  });

  it('flags wrong arity', () => {
    const result = validatePromQL('label_replace(up, "a")');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === DiagnosticCode.WrongArity)).toBe(true);
  });

  it('warns (not errors) on unknown functions by default', () => {
    const result = validatePromQL('made_up_function(metric)');
    expect(result.valid).toBe(true);
    expect(result.diagnostics.some((d) => d.code === DiagnosticCode.UnknownFunction && d.severity === 'warning')).toBe(true);
  });

  it('respects unknownFunctionSeverity: error', () => {
    const result = validatePromQL('made_up_function(metric)', { unknownFunctionSeverity: 'error' });
    expect(result.valid).toBe(false);
  });

  it('suggests a close match for a typo\'d function name', () => {
    const result = validatePromQL('rat(metric[5m])', { unknownFunctionSeverity: 'error' });
    const diag = result.diagnostics.find((d) => d.code === DiagnosticCode.UnknownFunction);
    expect(diag?.suggestion).toMatch(/rate/);
  });
});

describe('validatePromQL — incomplete (mid-typing) states', () => {
  const incompletes = ['rate(', 'sum(', 'metric{', 'metric{label=', 'sum by ('];
  for (const q of incompletes) {
    it(`treats "${q}" as incomplete, not an error`, () => {
      const result = validatePromQL(q);
      expect(result.incomplete).toBe(true);
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    });
  }
});

describe('validatePromQL — edge cases', () => {
  it('treats empty input as valid and not incomplete', () => {
    const result = validatePromQL('');
    expect(result).toEqual({ valid: true, diagnostics: [], incomplete: false });
  });

  it('treats whitespace-only input the same as empty', () => {
    const result = validatePromQL('   \n\t  ');
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('never throws on garbage input', () => {
    const garbage = ['{{{{{', ')))((()', '=====', String.fromCharCode(0, 1, 2, 3), 'a'.repeat(500) + '(((((('];
    for (const g of garbage) {
      expect(() => validatePromQL(g)).not.toThrow();
    }
  });

  it('guards against pathological nesting depth without crashing', () => {
    const deeplyNested = '('.repeat(500) + '1' + ')'.repeat(500);
    expect(() => validatePromQL(deeplyNested)).not.toThrow();
    const result = validatePromQL(deeplyNested);
    expect(result.diagnostics.some((d) => d.code === DiagnosticCode.TooComplex)).toBe(true);
  });

  it('skips live validation beyond maxQueryLength', () => {
    const long = 'a'.repeat(20_000);
    const result = validatePromQL(long, { maxQueryLength: 10_000 });
    expect(result.diagnostics[0]?.code).toBe('PQ_QUERY_TOO_LONG');
  });
});

describe('validatePromQL — dialect', () => {
  it('defaults to promql and accepts a valid query', () => {
    expect(validatePromQL('up', { dialect: 'promql' }).valid).toBe(true);
  });

  it('accepts a plain PromQL query under the metricsql dialect too (a strict superset)', () => {
    expect(validatePromQL('rate(x[5m])', { dialect: 'metricsql' }).valid).toBe(true);
  });

  it('throws UnsupportedDialectError for a genuinely unknown dialect string', () => {
    expect(() => validatePromQL('up', { dialect: 'made-up-dialect' as never })).toThrow(UnsupportedDialectError);
  });
});

describe('validatePromQL — custom validators', () => {
  it('runs custom validators alongside the built-in ones', () => {
    const result = validatePromQL('rate(forbidden_metric[5m])', {
      validators: [
        (ast, query) => {
          if (query.includes('forbidden_metric')) {
            return [{ severity: 'error', code: 'CUSTOM_FORBIDDEN', message: 'forbidden metric', start: 0, end: 1, line: 1, column: 1 }];
          }
          void ast;
          return [];
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'CUSTOM_FORBIDDEN')).toBe(true);
  });
});
