// @vitest-environment node
//
// A genuine SSR test: runs under Node's environment (no jsdom), so `window`/`document`
// are truly undefined — unlike the rest of this package's jsdom-based test suite, which
// can't actually catch a `typeof window` SSR bug since jsdom always defines `window`.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PromQLInput } from '../PromQLInput.js';

describe('PromQLInput — real SSR (no window/document)', () => {
  it('renders to a string without throwing', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToString(<PromQLInput defaultValue="rate(x[5m])" aria-label="query" />);
    expect(html).toContain('rate(x[5m])');
  });

  it('does not warn about useLayoutEffect on the server', () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderToString(<PromQLInput defaultValue="up" aria-label="query" />);
    const layoutEffectWarning = warnSpy.mock.calls.some((call) => String(call[0]).includes('useLayoutEffect'));
    warnSpy.mockRestore();
    expect(layoutEffectWarning).toBe(false);
  });
});
