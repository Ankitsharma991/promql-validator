import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromQLInput } from '../PromQLInput.js';
import { PromQLSuggestionRegistryProvider } from '../SuggestionRegistry.js';

describe('PromQLSuggestionRegistryProvider', () => {
  it('lets a <PromQLInput/> inherit dynamicSuggestions from the registry when it has no override', async () => {
    render(
      <PromQLSuggestionRegistryProvider dynamicSuggestions={[{ category: 'service', values: ['api-server', 'payment-service'] }]}>
        <PromQLInput defaultValue={'http_requests_total{service='} aria-label="query" />
      </PromQLSuggestionRegistryProvider>,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    await userEvent.keyboard('a');
    const listbox = await screen.findByRole('listbox');
    expect(listbox.textContent).toMatch(/api-server|payment-service/);
  });

  it('a per-instance prop overrides the registry value', async () => {
    render(
      <PromQLSuggestionRegistryProvider dynamicSuggestions={[{ category: 'service', values: ['from-registry'] }]}>
        <PromQLInput defaultValue={'http_requests_total{service='} dynamicSuggestions={[{ category: 'service', values: ['from-instance'] }]} aria-label="query" />
      </PromQLSuggestionRegistryProvider>,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    await userEvent.keyboard('f');
    const listbox = await screen.findByRole('listbox');
    expect(listbox.textContent).toContain('from-instance');
    expect(listbox.textContent).not.toContain('from-registry');
  });

  it('multiple editors sharing a registry async provider both receive results (shared controller, multi-listener)', async () => {
    const provider = vi.fn(async (context: { activeLabel?: string }) => [{ label: 'shared-result', value: 'shared-result', category: context.activeLabel ?? 'custom' }]);

    render(
      <PromQLSuggestionRegistryProvider suggestionProvider={provider}>
        <PromQLInput defaultValue={'a{service='} aria-label="query-a" />
        <PromQLInput defaultValue={'b{service='} aria-label="query-b" />
      </PromQLSuggestionRegistryProvider>,
    );

    const inputA = screen.getByRole('combobox', { name: 'query-a' }) as HTMLInputElement;
    inputA.focus();
    inputA.setSelectionRange(inputA.value.length, inputA.value.length);
    await userEvent.keyboard('s');

    const inputB = screen.getByRole('combobox', { name: 'query-b' }) as HTMLInputElement;
    inputB.focus();
    inputB.setSelectionRange(inputB.value.length, inputB.value.length);
    await userEvent.keyboard('s');

    await waitFor(
      () => {
        expect(screen.getAllByText('shared-result').length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 },
    );
  });
});
