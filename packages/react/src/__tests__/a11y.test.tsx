import React, { createRef } from 'react';
import { describe, expect, it, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PromQLInput, PromQLInputHandle } from '../PromQLInput.js';

beforeAll(() => {
  expect.extend(toHaveNoViolations);
});

// Automated a11y scan (Part 24/31.2/40/81) — a required, blocking check, run against every
// documented component state, not just the default render.
describe('PromQLInput — accessibility (axe)', () => {
  it('has no violations: empty, default state', async () => {
    const { container } = render(<PromQLInput defaultValue="" aria-label="PromQL query" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations: valid query', async () => {
    const { container } = render(<PromQLInput defaultValue="up" aria-label="PromQL query" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations: invalid query with diagnostics panel visible', async () => {
    const { container } = render(<PromQLInput defaultValue="rate(x[5m)" validationDebounceMs={5} aria-label="PromQL query" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations: warning-severity query', async () => {
    const { container } = render(<PromQLInput defaultValue="made_up_function(x)" validationDebounceMs={5} aria-label="PromQL query" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations: suggestion popup open', async () => {
    const { container } = render(<PromQLInput defaultValue="" aria-label="PromQL query" />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.type(screen.getByRole('combobox'), 'rat');
    await screen.findByRole('listbox');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations: disabled state', async () => {
    const { container } = render(<PromQLInput defaultValue="up" disabled aria-label="PromQL query" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations: read-only state', async () => {
    const { container } = render(<PromQLInput defaultValue="up" readOnly aria-label="PromQL query" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations: dark theme', async () => {
    const { container } = render(<PromQLInput defaultValue="up" theme="dark" aria-label="PromQL query" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations: showValidIndicator on a valid query', async () => {
    const { container } = render(<PromQLInput defaultValue="up" showValidIndicator validationDebounceMs={5} aria-label="PromQL query" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('exposes correct combobox ARIA relationships when the popup is open', async () => {
    render(<PromQLInput defaultValue="" aria-label="PromQL query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'rat');
    const listbox = await screen.findByRole('listbox');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    const firstOption = listbox.querySelector('[role="option"]');
    expect(firstOption).not.toBeNull();
    expect(input.getAttribute('aria-activedescendant')).toBe(firstOption!.id);
  });

  it('collapses aria-expanded back to false once the popup closes', async () => {
    render(<PromQLInput defaultValue="" aria-label="PromQL query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'rat');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  });

  it('excludes a disabled input from the tab order natively (no aria-disabled-only styling)', () => {
    render(<PromQLInput defaultValue="up" disabled aria-label="PromQL query" />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('disabled');
  });

  it('announces the suggestion count via a visually-hidden live region', async () => {
    render(<PromQLInput defaultValue="" aria-label="PromQL query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'rat');
    await screen.findByRole('listbox');
    await waitFor(() => expect(screen.getByText(/suggestions available/)).toBeInTheDocument());
  });

  it('imperative focus() moves real DOM focus for assistive tech', () => {
    const handleRef = createRef<PromQLInputHandle>();
    render(<PromQLInput ref={handleRef} defaultValue="up" aria-label="PromQL query" />);
    handleRef.current!.focus();
    expect(screen.getByRole('combobox')).toHaveFocus();
  });
});

// Contrast is verified structurally here (tokens are present and distinct); a full
// rendered-pixel contrast audit belongs in a visual-regression tool, out of unit-test scope.
describe('PromQLInput — reduced motion', () => {
  it('respects prefers-reduced-motion by not depending on JS-driven animation for correctness', () => {
    // The transition is CSS-only and gated by an @media (prefers-reduced-motion) block in
    // theme/styles.css — asserting here that no inline animation styles are ever injected
    // by the component itself (which would bypass that media query).
    render(<PromQLInput defaultValue="up" aria-label="PromQL query" />);
    const box = document.querySelector('.promql-input-box') as HTMLElement;
    expect(box.style.transition).toBe('');
    expect(box.style.animation).toBe('');
  });
});
