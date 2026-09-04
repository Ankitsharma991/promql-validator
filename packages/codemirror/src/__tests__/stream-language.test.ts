import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { promqlLanguage } from '../stream-language.js';

function tokensFor(doc: string): { name: string; text: string }[] {
  const state = EditorState.create({ doc, extensions: [promqlLanguage] });
  const tree = syntaxTree(state);
  const out: { name: string; text: string }[] = [];
  tree.iterate({
    enter: (node) => {
      if (node.node.firstChild === null) {
        out.push({ name: node.name, text: doc.slice(node.from, node.to) });
      }
    },
  });
  return out;
}

describe('promqlLanguage (StreamLanguage bridge)', () => {
  it('tokenizes a function call and a metric name as distinct token types', () => {
    const tokens = tokensFor('rate(http_requests_total[5m])');
    const rateToken = tokens.find((t) => t.text === 'rate');
    const metricToken = tokens.find((t) => t.text === 'http_requests_total');
    expect(rateToken?.name).toMatch(/variableName/i);
    expect(metricToken?.name).toMatch(/variableName/i);
  });

  it('tokenizes a keyword (by/without/and/or/unless) distinctly', () => {
    const tokens = tokensFor('sum by (service) (x)');
    const byToken = tokens.find((t) => t.text === 'by');
    expect(byToken?.name).toMatch(/keyword/i);
  });

  it('tokenizes a string literal', () => {
    const tokens = tokensFor('up{job="api"}');
    const stringToken = tokens.find((t) => t.text === '"api"');
    expect(stringToken?.name).toMatch(/string/i);
  });

  it('tokenizes a number/duration', () => {
    const tokens = tokensFor('rate(x[5m])');
    const durationToken = tokens.find((t) => t.text === '5m');
    expect(durationToken?.name).toMatch(/number/i);
  });

  it('never throws on malformed input', () => {
    expect(() => tokensFor('{{{ garbage )))')).not.toThrow();
    expect(() => tokensFor('')).not.toThrow();
  });

  it('handles a multi-line document (retokenizing per line)', () => {
    const tokens = tokensFor('rate(x[5m])\n+ rate(y[5m])');
    expect(tokens.some((t) => t.text === 'x')).toBe(true);
    expect(tokens.some((t) => t.text === 'y')).toBe(true);
  });
});
