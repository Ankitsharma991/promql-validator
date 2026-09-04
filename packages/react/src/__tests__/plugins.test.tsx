import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PromQLPlugin } from '@promql-validator/core';
import { PromQLInput } from '../PromQLInput.js';

const allowlistPlugin: PromQLPlugin = {
  name: 'metric-allowlist',
  validators: [
    (_ast, query) =>
      query.includes('forbidden_metric')
        ? [{ severity: 'error' as const, code: 'ORG_FORBIDDEN_METRIC', message: 'This metric is not allowed.', start: 0, end: query.length, line: 1, column: 1 }]
        : [],
  ],
  suggestions: ['from-plugin'],
};

describe('PromQLInput — plugins prop', () => {
  it("runs a plugin's validator alongside built-in validation", async () => {
    render(<PromQLInput defaultValue="rate(forbidden_metric[5m])" plugins={[allowlistPlugin]} validationDebounceMs={5} aria-label="query" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toContain('This metric is not allowed.');
  });

  it('composes with a directly-passed validators prop rather than replacing it', async () => {
    render(
      <PromQLInput
        defaultValue="up"
        plugins={[allowlistPlugin]}
        validators={[() => [{ severity: 'warning', code: 'DIRECT_RULE', message: 'direct rule fired', start: 0, end: 2, line: 1, column: 1 }]]}
        validationDebounceMs={5}
        aria-label="query"
      />,
    );
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toContain('direct rule fired');
  });

  it('accepts a dialect prop, validating a MetricsQL-only construct successfully', async () => {
    render(<PromQLInput defaultValue="rate(x[5m]) keep_metric_names" dialect="metricsql" validationDebounceMs={5} aria-label="query" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects the same MetricsQL-only construct under the default (promql) dialect', async () => {
    render(<PromQLInput defaultValue="rate(x[5m]) keep_metric_names" validationDebounceMs={5} aria-label="query" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it("surfaces a plugin's static suggestions", async () => {
    render(<PromQLInput defaultValue="" plugins={[allowlistPlugin]} aria-label="query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'from');
    const listbox = await screen.findByRole('listbox');
    expect(listbox.textContent).toContain('from-plugin');
  });
});
