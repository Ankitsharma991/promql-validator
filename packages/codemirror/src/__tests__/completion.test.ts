import { describe, expect, it, vi } from 'vitest';
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

describe('promqlCompletionSource — snippets and async providers', () => {
  it('puts the cursor inside the parentheses after inserting a function', () => {
    const result = promqlCompletionSource()(contextFor('rat', 3)) as CompletionResultLike;
    const rate = result.options.find((o) => o.label === 'rate')!;
    const dispatch = vi.fn();
    (rate.apply as (view: unknown, c: unknown, from: number, to: number) => void)({ dispatch }, rate, 0, 3);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ changes: { from: 0, to: 3, insert: 'rate()' }, selection: { anchor: 5 } }));
  });

  it('merges results from an async suggestionProvider', async () => {
    const provider = vi.fn(async () => [{ label: 'checkout', value: 'checkout', category: 'service' }, { bogus: true } as never]);
    const source = promqlCompletionSource({ suggestionProvider: provider });
    const doc = 'up{service="';
    const result = (await source(contextFor(doc, doc.length))) as CompletionResultLike;
    expect(provider).toHaveBeenCalledTimes(1);
    expect(result.options.map((o) => o.label)).toContain('checkout');
  });
});

type CompletionResultLike = { options: Array<{ label: string; apply?: unknown }> };
