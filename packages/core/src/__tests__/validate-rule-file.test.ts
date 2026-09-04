import { describe, expect, it } from 'vitest';
import { validateRecordingRuleFile } from '../rule-file/validate-rule-file.js';

const VALID_FILE = `
groups:
  - name: example
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))
        labels:
          team: infra
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.1
        for: 10m
        labels:
          severity: page
        annotations:
          summary: "High error rate"
`;

const BLOCK_SCALAR_FILE = `
groups:
  - name: example
    rules:
      - record: job:http_requests:rate5m
        expr: |
          sum by (job) (
            rate(http_requests_total[5m])
          )
`;

const INVALID_FILE = `
groups:
  - name: example
    rules:
      - record: broken_rule
        expr: rate(http_requests_total[5m)
`;

const MULTI_GROUP_FILE = `
groups:
  - name: group-one
    rules:
      - record: a
        expr: up
  - name: group-two
    rules:
      - record: b
        expr: rate(x[5m])
`;

describe('validateRecordingRuleFile', () => {
  it('extracts and validates every rule expr in a well-formed file', () => {
    const result = validateRecordingRuleFile(VALID_FILE);
    expect(result.valid).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({ groupName: 'example', ruleType: 'record', ruleName: 'job:http_requests:rate5m' });
    expect(result.entries[1]).toMatchObject({ ruleType: 'alert', ruleName: 'HighErrorRate' });
  });

  it('handles a literal block-scalar (|) multi-line expr', () => {
    const result = validateRecordingRuleFile(BLOCK_SCALAR_FILE);
    expect(result.valid).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.expr).toContain('rate(http_requests_total[5m])');
  });

  it('flags an invalid expr within an otherwise well-formed file', () => {
    const result = validateRecordingRuleFile(INVALID_FILE);
    expect(result.valid).toBe(false);
    expect(result.entries[0]!.result.valid).toBe(false);
  });

  it('associates each rule with the correct group across multiple groups', () => {
    const result = validateRecordingRuleFile(MULTI_GROUP_FILE);
    expect(result.entries.map((e) => e.groupName)).toEqual(['group-one', 'group-two']);
  });

  it('records the line number of each expr key', () => {
    const result = validateRecordingRuleFile(VALID_FILE);
    const exprLineText = VALID_FILE.split('\n')[result.entries[0]!.line - 1];
    expect(exprLineText).toContain('expr:');
  });

  it('never throws on a malformed/empty file', () => {
    expect(() => validateRecordingRuleFile('')).not.toThrow();
    expect(() => validateRecordingRuleFile('not: valid: yaml: at: all: :::')).not.toThrow();
    expect(validateRecordingRuleFile('').entries).toEqual([]);
  });

  it('passes through validation options (e.g. custom functions)', () => {
    const file = `
groups:
  - name: g
    rules:
      - record: r
        expr: my_custom_func(x)
`;
    const strict = validateRecordingRuleFile(file, { unknownFunctionSeverity: 'error' });
    expect(strict.valid).toBe(false);
    const relaxed = validateRecordingRuleFile(file, { customFunctions: ['my_custom_func'] });
    expect(relaxed.valid).toBe(true);
  });
});
