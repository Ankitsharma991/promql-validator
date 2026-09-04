import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { promqlCompletionSource } from '../completion.js';

function contextFor(doc: string, pos: number, explicit = true): CompletionContext {
  const state = EditorState.create({ doc });
  return new CompletionContext(state, pos, explicit);
}

describe('promqlCompletionSource', () => {
  it('offers built-in functions at the top level', () => {
    const source = promqlCompletionSource();
    const result = source(contextFor('rat', 3));
    expect(result).not.toBeNull();
    expect(result!.options.some((o) => o.label === 'rate')).toBe(true);
  });

  it('offers label names inside a label-name position, not functions', () => {
    const source = promqlCompletionSource();
    const doc = 'http_requests_total{';
    const result = source(contextFor(doc, doc.length));
    expect(result).not.toBeNull();
    expect(result!.options.some((o) => o.label === 'job')).toBe(true);
    expect(result!.options.some((o) => o.label === 'rate')).toBe(false);
  });

  it('surfaces host dynamic suggestions in a label-value position', () => {
    const source = promqlCompletionSource({ sources: { dynamicSuggestions: [{ category: 'service', values: ['api-server'] }] } });
    const doc = 'http_requests_total{service="a';
    const result = source(contextFor(doc, doc.length));
    expect(result!.options.some((o) => o.label === 'api-server')).toBe(true);
  });

  it('sets a from position at the start of the partially-typed word', () => {
    const source = promqlCompletionSource();
    const result = source(contextFor('rat', 3));
    expect(result!.from).toBe(0);
  });

  it('returns null when nothing matches and completion is not explicit', () => {
    const source = promqlCompletionSource();
    const doc = 'http_requests_total{service="zzzznonexistentprefix';
    const result = source(contextFor(doc, doc.length, false));
    // no host data supplied for "service", and the prefix matches no built-ins either
    expect(result === null || result.options.length === 0).toBe(true);
  });
});
