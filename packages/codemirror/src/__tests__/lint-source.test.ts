import { describe, expect, it } from 'vitest';
import { computePromQLDiagnostics } from '../lint-source.js';

describe('computePromQLDiagnostics', () => {
  it('returns no diagnostics for a valid query', () => {
    expect(computePromQLDiagnostics('rate(x[5m])')).toEqual([]);
  });

  it('returns a mapped diagnostic for an invalid query', () => {
    const diags = computePromQLDiagnostics('rate(x[5m)');
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({ severity: 'error', source: 'PQ_UNCLOSED_BRACKET' });
    expect(diags[0]!.from).toBeLessThan(diags[0]!.to);
  });

  it('clamps positions within document bounds', () => {
    const diags = computePromQLDiagnostics('rate(x[5m');
    for (const d of diags) {
      expect(d.from).toBeGreaterThanOrEqual(0);
      expect(d.to).toBeLessThanOrEqual('rate(x[5m'.length);
    }
  });

  it('appends the suggestion text to the message', () => {
    const diags = computePromQLDiagnostics('rat(x[5m])', { unknownFunctionSeverity: 'error' });
    expect(diags[0]!.message).toMatch(/did you mean/i);
  });

  it('forwards validation options (dialect, customFunctions)', () => {
    expect(computePromQLDiagnostics('rollup_rate(x[5m])', { dialect: 'promql', unknownFunctionSeverity: 'error' })[0]).toMatchObject({ source: 'PQ_UNKNOWN_FUNCTION' });
    expect(computePromQLDiagnostics('rollup_rate(x[5m])', { dialect: 'metricsql', unknownFunctionSeverity: 'error' })).toEqual([]);
  });

  it('never throws on malformed input', () => {
    expect(() => computePromQLDiagnostics('{{{{ )))')).not.toThrow();
  });
});
