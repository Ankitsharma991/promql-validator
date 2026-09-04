import React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromQLInput } from '../PromQLInput.js';

// jsdom does no real layout — every element measures 0x0 by default, so the virtualizer
// (which sizes its visible window off the scroll container's measured height) would see
// nothing "in view" and render zero rows. In a real browser the popup's CSS gives it a
// genuine height (theme/styles.css's max-height: 300px); this stands in for that here.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 300 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 44 });
});

describe('PromQLInput — suggestionListMode="virtualized"', () => {
  it('renders a listbox and lets the user select an item via the virtualized popup', async () => {
    const values = Array.from({ length: 2000 }, (_, i) => `service-${i}`);
    render(
      <PromQLInput
        defaultValue={'http_requests_total{service='}
        dynamicSuggestions={[{ category: 'service', values }]}
        suggestionListMode="virtualized"
        maxSuggestions={500}
        aria-label="query"
      />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    await userEvent.keyboard('s');

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();
    // Virtualization means only a bounded window of options is actually mounted, not all 500.
    const options = listbox.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThan(500);

    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(input.value).toContain('service-'));
  });

  it('falls back to the default popup when suggestionListMode is unset', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'rat');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });
});
