import { describe, expect, it } from 'vitest';
import { validatePromQL } from '../validator/validate.js';
import { getQuickFix } from '../validator/quick-fix.js';

// States an editor passes through while the user is typing (auto-closed brackets leave
// empty slots behind) must read as `incomplete`, never as errors.
describe('validatePromQL — mid-typing states with auto-closed brackets', () => {
  it.each(['rate()', 'ceil()', 'sqrt(absent_over_time())', 'sum()', 'sum by (job) ()', 'topk(5, )', 'topk(, up)', 'histogram_quantile(0.95, )', 'rate(up[])', 'avg(up) + sum()'])(
    '%s is incomplete with no diagnostics',
    (q) => {
      expect(validatePromQL(q)).toEqual({ valid: true, incomplete: true, diagnostics: [] });
    },
  );

  it.each(['time()', 'pi()', 'vector(1)', 'rate(up[5m])', 'quantile_over_time(0.9, up[5m])', 'topk(5, up)', 'count_values("v", up)', 'sum(rate(x[5m])) by (job)', 'max_over_time(rate(x[5m])[1h:])'])(
    '%s is complete and valid',
    (q) => {
      expect(validatePromQL(q)).toEqual({ valid: true, incomplete: false, diagnostics: [] });
    },
  );
});

describe('validatePromQL — aggregation arity', () => {
  it('rejects too many arguments', () => {
    const r = validatePromQL('sum(a, b)');
    expect(r.valid).toBe(false);
    expect(r.diagnostics).toMatchObject([{ code: 'PQ_WRONG_ARITY', severity: 'error' }]);
  });

  it('rejects a parameter aggregation without its vector', () => {
    const r = validatePromQL('topk(5)');
    expect(r.diagnostics).toMatchObject([{ code: 'PQ_WRONG_ARITY', message: expect.stringContaining("topk(5, metric)") }]);
  });

  it('leaves MetricsQL aggregation signatures alone', () => {
    expect(validatePromQL('sum(a, b)', { dialect: 'metricsql' }).diagnostics).toEqual([]);
  });
});

describe('validatePromQL — error reporting quality', () => {
  it('reports a single, specific error for a range with no selector', () => {
    const r = validatePromQL('sqrt(absent_over_time([5m]))');
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]).toMatchObject({ code: 'PQ_UNEXPECTED_TOKEN', start: 22, message: expect.stringContaining("must follow a metric selector") });
  });

  it('reports only the first syntax error after which the parser is recovering', () => {
    const r = validatePromQL('rate(x[5m) + )');
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(1);
  });

  it('checks the range argument at its actual position', () => {
    const r = validatePromQL('quantile_over_time(0.9, up)');
    expect(r.diagnostics).toMatchObject([{ code: 'PQ_WRONG_ARG_TYPE', start: 24, end: 26 }]);
  });

  it('gives semantic diagnostics real line/column positions', () => {
    const r = validatePromQL('up\n+ rate(x)');
    expect(r.diagnostics).toMatchObject([{ code: 'PQ_WRONG_ARG_TYPE', line: 2, column: 8 }]);
  });
});

describe('getQuickFix — range-vector argument', () => {
  const fixFor = (q: string) => {
    const d = validatePromQL(q).diagnostics.find((x) => x.code === 'PQ_WRONG_ARG_TYPE')!;
    return { d, fix: getQuickFix(d, q) };
  };

  it.each([
    ['rate(up)', 'rate(up[5m])'],
    ['absent_over_time(http_requests_total{job="api", code=~"5.."})', 'absent_over_time(http_requests_total{job="api", code=~"5.."}[5m])'],
    ['quantile_over_time(0.9, up)', 'quantile_over_time(0.9, up[5m])'],
  ])('fixes %s', (q, expected) => {
    const { fix } = fixFor(q);
    expect(fix?.label).toBe("Add range '[5m]'");
    const applied = fix!.apply(q);
    expect(applied.value).toBe(expected);
    expect(validatePromQL(applied.value)).toEqual({ valid: true, incomplete: false, diagnostics: [] });
  });

  it('offers nothing when the argument is not a plain selector', () => {
    expect(fixFor('rate(sum(up))').fix).toBeNull();
  });

  it('offers nothing without the query text', () => {
    expect(getQuickFix(fixFor('rate(up)').d)).toBeNull();
  });
});
