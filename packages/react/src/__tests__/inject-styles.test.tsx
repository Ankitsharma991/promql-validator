import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PromQLInput } from '../PromQLInput.js';
import { STYLE_ELEMENT_ID, promqlStylesheet } from '../theme/inject-styles.js';

const injected = () => document.querySelectorAll(`#${STYLE_ELEMENT_ID}`);

afterEach(() => injected().forEach((el) => el.remove()));

describe('default stylesheet injection', () => {
  it('adds the stylesheet once, as the first element in <head>, however many editors render', () => {
    const app = document.createElement('style');
    app.textContent = '.promql-input-root { --promql-input-radius: 0px; }';
    document.head.appendChild(app);

    render(
      <>
        <PromQLInput aria-label="a" />
        <PromQLInput aria-label="b" />
      </>,
    );

    expect(injected()).toHaveLength(1);
    expect(document.head.firstElementChild?.id).toBe(STYLE_ELEMENT_ID);
    expect(injected()[0]!.textContent).toBe(promqlStylesheet);
    expect(promqlStylesheet).toContain('--promql-input-background');
    app.remove();
  });

  it('applies a CSP nonce', () => {
    render(<PromQLInput styleNonce="abc123" aria-label="q" />);
    expect((injected()[0] as HTMLStyleElement).nonce).toBe('abc123');
  });

  it('does nothing with injectStyles={false}', () => {
    render(<PromQLInput injectStyles={false} aria-label="q" />);
    expect(injected()).toHaveLength(0);
  });

  it('leaves an app-rendered copy alone', () => {
    const own = document.createElement('style');
    own.id = STYLE_ELEMENT_ID;
    document.head.appendChild(own);
    render(<PromQLInput aria-label="q" />);
    expect(injected()).toHaveLength(1);
    expect(injected()[0]).toBe(own);
  });
});
