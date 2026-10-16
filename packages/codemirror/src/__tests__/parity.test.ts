import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { getSuggestions, validatePromQL } from '@promql-validator/core';
import { computePromQLDiagnostics } from '../lint-source.js';
import { promqlCompletionSource } from '../completion.js';

// The adapter must report exactly what core reports: same diagnostics, same suggestions.
const GOLDEN = ['rate(http_requests_total[5m])', 'rate(x)', 'sum(a, b)', 'up{job=}', 'rate(x[5m)', 'foo(bar)', 'up{"service.name"="a"}', 'histogram_quantile(0.9)', 'x[5m1h]'];
const CURSORS = ['rat', 'up{', 'up{job="', 'rate(x[', 'sum by (', 'up '];

describe('CodeMirror adapter parity with core', () => {
  it.each(GOLDEN)('diagnostics for %s', (q) => {
    const core = validatePromQL(q).diagnostics;
    const cm = computePromQLDiagnostics(q);
    // CodeMirror has no separate "suggestion" field, so the adapter appends it to the message.
    const expected = core.map((d) => [Math.min(d.start, q.length), d.suggestion ? `${d.message} ${d.suggestion}` : d.message, d.code]);
    expect(cm.map((d) => [d.from, d.message, d.source])).toEqual(expected);
  });

  it.each(CURSORS)('suggestions for %s', (q) => {
    const result = promqlCompletionSource()(new CompletionContext(EditorState.create({ doc: q }), q.length, true)) as { options: Array<{ label: string }> } | null;
    expect(result?.options.map((o) => o.label) ?? []).toEqual(getSuggestions(q, q.length).map((s) => s.label));
  });
});
