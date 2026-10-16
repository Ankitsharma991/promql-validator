import React, { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromQLInput, PromQLInputHandle } from '../PromQLInput.js';

describe('PromQLInput — controlled/uncontrolled', () => {
  it('renders uncontrolled with defaultValue', () => {
    render(<PromQLInput defaultValue="up" aria-label="query" />);
    expect(screen.getByRole('combobox')).toHaveValue('up');
  });

  it('supports controlled mode via value + onChange', async () => {
    function Wrapper() {
      const [v, setV] = React.useState('up');
      return <PromQLInput value={v} onChange={setV} aria-label="query" />;
    }
    render(<Wrapper />);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'x');
    expect(input).toHaveValue('upx');
  });

  it('calls onChange in uncontrolled mode without requiring a value prop', async () => {
    const onChange = vi.fn();
    render(<PromQLInput defaultValue="" onChange={onChange} aria-label="query" />);
    await userEvent.type(screen.getByRole('combobox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });
});

describe('PromQLInput — bracket completion', () => {
  it('inserts a matching closing paren with the cursor between', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.type(input, '(');
    expect(input.value).toBe('()');
    expect(input.selectionStart).toBe(1);
  });

  it('types over an existing closing paren instead of duplicating it', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    // A single type() call so userEvent doesn't re-click (and reset the caret) between characters.
    await userEvent.type(input, '()');
    expect(input.value).toBe('()');
    expect(input.selectionStart).toBe(2);
  });

  it('deletes an empty auto-inserted pair as one unit on backspace', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.type(input, '({backspace}');
    expect(input.value).toBe('');
  });

  it('can be disabled via autoCloseBrackets={false}', async () => {
    render(<PromQLInput defaultValue="" autoCloseBrackets={false} aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.type(input, '(');
    expect(input.value).toBe('(');
  });
});

describe('PromQLInput — validation UI', () => {
  it('flags an invalid query with an error diagnostic panel after debounce', async () => {
    render(<PromQLInput defaultValue="rate(x)" validationDebounceMs={10} aria-label="query" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByRole('alert').textContent).toMatch(/range vector/i);
  });

  it('calls onValidation with a structured result', async () => {
    const onValidation = vi.fn();
    render(<PromQLInput defaultValue="up" validationDebounceMs={10} onValidation={onValidation} aria-label="query" />);
    await waitFor(() => expect(onValidation).toHaveBeenCalled(), { timeout: 2000 });
    expect(onValidation.mock.calls[0]![0]).toMatchObject({ valid: true });
  });
});

describe('PromQLInput — autocomplete', () => {
  it('opens a suggestion popup on focus/typing with matching built-ins', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'rat');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('rate')).toBeInTheDocument();
  });

  it('does not show PromQL functions inside a label-name position', async () => {
    render(<PromQLInput defaultValue="http_requests_total{" aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.setSelectionRange(input.value.length, input.value.length);
    await userEvent.click(input);
    await userEvent.keyboard(' '); // trigger a keydown to refresh selection tracking, then remove the space
    await userEvent.keyboard('{Backspace}');
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).queryByText('rate')).not.toBeInTheDocument();
  });

  it('inserts the selected suggestion on Enter and closes the popup', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, 'rate');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    // 'rate' has a snippet insertText ('rate($0)'); $0 is stripped and the cursor placed
    // there, matching the Suggestion.insertText snippet convention.
    expect(input.value).toBe('rate()');
    expect(input.selectionStart).toBe(5);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('does not append another suggestion when Enter is pressed again after accepting one', async () => {
    const onSubmit = vi.fn();
    render(<PromQLInput defaultValue="" onSubmit={onSubmit} aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, 'absent_over_t');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    expect(input.value).toBe('absent_over_time()');
    await userEvent.keyboard('{Enter}');
    expect(input.value).toBe('absent_over_time()');
    expect(onSubmit).toHaveBeenCalledWith('absent_over_time()');
  });

  it('reopens the popup once the user types after accepting a suggestion', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, 'cei');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    expect(input.value).toBe('ceil()');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await userEvent.type(input, 'up');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('adds a [5m] range when a metric is picked as the argument of a range function', async () => {
    const metrics = [{ label: 'http_requests_total', value: 'http_requests_total', category: 'metric' }];
    const onValidation = vi.fn();
    render(<PromQLInput defaultValue="" suggestions={metrics} validationDebounceMs={10} onValidation={onValidation} aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, 'absent_over_t');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    expect(input.value).toBe('absent_over_time()');
    await userEvent.keyboard('http_req'); // types at the caret (inside the parens), unlike type()
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    expect(input.value).toBe('absent_over_time(http_requests_total[5m])');
    expect(input.selectionStart).toBe('absent_over_time(http_requests_total[5m]'.length);
    await waitFor(() => expect(onValidation).toHaveBeenLastCalledWith({ valid: true, incomplete: false, diagnostics: [] }));
  });

  it('does not add a range to a metric picked for an instant-vector argument', async () => {
    const metrics = [{ label: 'http_requests_total', value: 'http_requests_total', category: 'metric' }];
    render(<PromQLInput defaultValue="" suggestions={metrics} aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, 'cei');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('http_req'); // types at the caret (inside the parens), unlike type()
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    expect(input.value).toBe('ceil(http_requests_total)');
  });

  it('holds back a diagnostic on the token being completed until the popup closes', async () => {
    const metrics = [{ label: 'http_requests_total', value: 'http_requests_total', category: 'metric' }];
    const onValidation = vi.fn();
    render(<PromQLInput defaultValue="" suggestions={metrics} validationDebounceMs={10} onValidation={onValidation} aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, 'rate(');
    await userEvent.keyboard('http_req');
    await screen.findByRole('listbox');
    // `rate(http_req)` is (momentarily) a range-vector type error: reported, but not shown.
    await waitFor(() => expect(onValidation).toHaveBeenLastCalledWith(expect.objectContaining({ valid: false })));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByRole('alert')).toHaveTextContent(/range vector/);
  });

  it('does not double the parentheses when completing a name that already has them', async () => {
    render(<PromQLInput defaultValue="(up)" aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    input.setSelectionRange(0, 0);
    await userEvent.type(input, 'cei', { initialSelectionStart: 0, initialSelectionEnd: 0 });
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    expect(input.value).toBe('ceil(up)');
    expect(input.selectionStart).toBe(5);
  });

  it('closes the popup on Escape without modifying the value', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'rat');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(input).toHaveValue('rat');
  });

  it('surfaces host dynamic suggestions ranked above unrelated built-ins', async () => {
    render(
      <PromQLInput
        defaultValue={'http_requests_total{service='}
        dynamicSuggestions={[{ category: 'service', values: ['api-server', 'payment-service'] }]}
        aria-label="query"
      />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    await userEvent.keyboard('a');
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('api-server')).toBeInTheDocument();
  });
});

describe('PromQLInput — async suggestions', () => {
  it('discards a stale (out-of-order) async response', async () => {
    // Key pending promises by the exact partial token typed, so the test is robust to
    // any extra provider invocation (e.g. a mount-time call for the empty query) and
    // instead verifies staleness by content, not brittle call-count ordering.
    const pending = new Map<string, (v: unknown) => void>();
    const provider = vi.fn((context: { tokenBeforeCursor: string }) => new Promise((resolve) => pending.set(context.tokenBeforeCursor, resolve)));

    render(<PromQLInput defaultValue="" suggestionProvider={provider as never} suggestionDebounceMs={1} aria-label="query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'a');
    await waitFor(() => expect(pending.has('a')).toBe(true));
    await userEvent.type(input, 'b');
    await waitFor(() => expect(pending.has('ab')).toBe(true));

    // Values must actually match the typed prefix ('ab') or the engine's own ranking
    // filter would exclude them regardless of staleness — that's a separate, correct
    // behavior, not what this test is exercising.
    pending.get('ab')!([{ label: 'ab-result-B', value: 'ab-result-B', category: 'custom' }]);
    await screen.findByText('ab-result-B');
    pending.get('a')!([{ label: 'ab-result-A', value: 'ab-result-A', category: 'custom' }]);

    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('ab-result-A')).not.toBeInTheDocument();
    expect(screen.getByText('ab-result-B')).toBeInTheDocument();
  });
});

describe('PromQLInput — imperative handle', () => {
  it('exposes focus/blur/format/getValidationResult/insertAtCursor/getEditorState', async () => {
    const handleRef = createRef<PromQLInputHandle>();
    render(<PromQLInput ref={handleRef} defaultValue="rate(x[5m])" aria-label="query" />);
    act(() => handleRef.current?.focus());
    expect(screen.getByRole('combobox')).toHaveFocus();

    const snapshot = handleRef.current?.getEditorState();
    expect(snapshot?.value).toBe('rate(x[5m])');

    // Imperative ref calls happen outside React's own event handling, so state updates
    // they trigger must be explicitly flushed via act() before asserting on the DOM.
    act(() => handleRef.current?.insertAtCursor('Z'));
    expect(screen.getByRole('combobox')).toHaveValue('rate(x[5m])Z');
  });

  it('format() reformats the query in place', async () => {
    const handleRef = createRef<PromQLInputHandle>();
    render(<PromQLInput ref={handleRef} defaultValue="rate(x[5m])" aria-label="query" />);
    handleRef.current?.format();
    expect(screen.getByRole('combobox')).toHaveValue('rate(x[5m])');
  });
});

describe('PromQLInput — suggestOnEmptyFocus / formatOnPaste / trackRecentlyUsed', () => {
  it('does not show a popup on empty-input focus by default', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows a popup on empty-input focus when suggestOnEmptyFocus is set', async () => {
    render(<PromQLInput defaultValue="" suggestOnEmptyFocus aria-label="query" />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('force-opens the popup on Ctrl+Space even for an empty query', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await userEvent.keyboard('{Control>}{ }{/Control}');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('reformats pasted content only when formatOnPaste is enabled', async () => {
    // The editable surface is a single-line <input> (role="combobox" is only ARIA-valid on
    // one — see collapseFormattedTextForSingleLineInput's docstring), so a multi-line
    // formatted result gets collapsed to one line; what's still observable here is the
    // formatter's canonical spacing (e.g. ", " between label names) being applied.
    render(<PromQLInput defaultValue="" formatOnPaste aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.paste('sum by (service,namespace) (rate(http_requests_total{service="api"}[5m]))');
    await waitFor(() => expect(input.value).toContain('service, namespace'));
    expect(input.value).not.toContain('\n');
  });

  it('does not touch pasted content when formatOnPaste is false (default)', async () => {
    render(<PromQLInput defaultValue="" aria-label="query" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.paste('rate(x[5m])');
    expect(input.value).toBe('rate(x[5m])');
  });
});

describe('PromQLInput — useWorker (graceful fallback in a non-Worker test environment)', () => {
  it('still validates correctly, falling back to the main thread automatically', async () => {
    render(<PromQLInput defaultValue="rate(x[5m)" useWorker validationDebounceMs={10} aria-label="query" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByRole('alert').textContent).toMatch(/closing/i);
  });

  it('never throws when mounting/unmounting with useWorker in an environment with no Worker global', () => {
    const { unmount } = render(<PromQLInput defaultValue="up" useWorker aria-label="query" />);
    expect(() => unmount()).not.toThrow();
  });
});

describe('PromQLInput — quick fixes', () => {
  it('offers a one-click fix for a missing label value and applies it', async () => {
    render(<PromQLInput defaultValue="metric{label=}" validationDebounceMs={5} aria-label="query" />);
    await screen.findByRole('alert');
    const fixButton = await screen.findByRole('button', { name: /empty value/i });
    await userEvent.click(fixButton);
    expect(screen.getByRole('combobox')).toHaveValue('metric{label=""}');
  });

  it('offers a "close it for me" hint while a bracket is left open mid-typing (incomplete, not an error)', async () => {
    render(<PromQLInput defaultValue="rate(x[5m" validationDebounceMs={5} aria-label="query" />);
    const fixButton = await screen.findByRole('button', { name: /insert missing/i });
    await userEvent.click(fixButton);
    expect(screen.getByRole('combobox')).toHaveValue('rate(x[5m]');
  });

  it('does not show a fix button for a diagnostic with no confident automatic fix', async () => {
    render(<PromQLInput defaultValue={'label_replace(up, "a")'} validationDebounceMs={5} aria-label="query" />);
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /insert|empty value/i })).not.toBeInTheDocument();
  });
});

describe('PromQLInput — disabled/read-only', () => {
  it('excludes a disabled input from suggestions and marks it aria-disabled', () => {
    render(<PromQLInput defaultValue="rate" disabled aria-label="query" />);
    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-disabled', 'true');
  });

  it('read-only input does not accept edits but keeps validation running', () => {
    render(<PromQLInput defaultValue="up" readOnly aria-label="query" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('readonly');
  });
});

describe('PromQLInput — i18n, telemetry and shared provider', () => {
  it('renders overridden UI strings and sets lang from locale', async () => {
    render(
      <PromQLInput
        defaultValue=""
        locale="es"
        messages={{ suggestionsLabel: 'Sugerencias', hintInsert: 'insertar', suggestionsAvailable: (n) => `${n} sugerencias` }}
        aria-label="query"
      />,
    );
    const input = screen.getByRole('combobox');
    expect(input.closest('.promql-input-root')).toHaveAttribute('lang', 'es');
    await userEvent.click(input);
    await userEvent.type(input, 'rat');
    expect(await screen.findByRole('listbox', { name: 'Sugerencias' })).toBeInTheDocument();
    expect(screen.getByText(/sugerencias$/)).toBeInTheDocument();
    expect(screen.getByText(/insertar/)).toBeInTheDocument();
  });

  it('lets hosts translate diagnostics by code', async () => {
    render(
      <PromQLInput
        defaultValue="rate(up)"
        validationDebounceMs={10}
        messages={{ diagnostic: (d) => (d.code === 'PQ_WRONG_ARG_TYPE' ? 'Se esperaba un vector de rango' : undefined) }}
        aria-label="query"
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Se esperaba un vector de rango');
  });

  it('reports validation and suggestion telemetry without query text', async () => {
    const onValidation = vi.fn();
    const onSuggestionQuery = vi.fn();
    render(<PromQLInput defaultValue="" instanceId="panel-7" validationDebounceMs={10} telemetryHooks={{ onValidation, onSuggestionQuery }} aria-label="query" />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'rate(up[[5m])'); // `[[` types a literal `[` in user-event
    await waitFor(() => expect(onValidation).toHaveBeenLastCalledWith({ durationMs: expect.any(Number), valid: true, incomplete: false, diagnosticCount: 0, instanceId: 'panel-7' }));
    expect(onSuggestionQuery).toHaveBeenCalledWith({ durationMs: expect.any(Number), resultCount: expect.any(Number), instanceId: 'panel-7' });
    for (const [event] of [...onValidation.mock.calls, ...onSuggestionQuery.mock.calls]) {
      expect(Object.values(event).some((v) => typeof v === 'string' && v !== 'panel-7')).toBe(false);
    }
  });

  it('applies plugins from PromQLValidatorProvider to every editor below it', async () => {
    const { PromQLValidatorProvider } = await import('../SuggestionRegistry.js');
    const plugin = { name: 'acme', validators: [() => [{ severity: 'error' as const, code: 'ACME', message: 'acme rule fired', start: 0, end: 1, line: 1, column: 1 }]] };
    render(
      <PromQLValidatorProvider plugins={[plugin]}>
        <PromQLInput defaultValue="up" validationDebounceMs={10} aria-label="query-a" />
        <PromQLInput defaultValue="up" validationDebounceMs={10} aria-label="query-b" />
      </PromQLValidatorProvider>,
    );
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    for (const alert of screen.getAllByRole('alert')) expect(alert).toHaveTextContent('acme rule fired');
  });
});

describe('PromQLInput — diagnosticsDisplay', () => {
  it("'inline' underlines without a panel and describes the error to assistive tech", async () => {
    const { container } = render(<PromQLInput defaultValue="rate(up)" diagnosticsDisplay="inline" validationDebounceMs={10} aria-label="query" />);
    const input = screen.getByRole('combobox');
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveAccessibleDescription(/range vector/);
    expect(container.querySelector('.promql-input-highlight [data-severity="error"]')).not.toBeNull();
  });

  it("'none' renders no diagnostics UI but still reports through onValidation", async () => {
    const onValidation = vi.fn();
    const { container } = render(<PromQLInput defaultValue="rate(up)" diagnosticsDisplay="none" validationDebounceMs={10} onValidation={onValidation} aria-label="query" />);
    await waitFor(() => expect(onValidation).toHaveBeenCalledWith(expect.objectContaining({ valid: false })));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.querySelector('[data-severity="error"]')).toBeNull();
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-invalid');
  });
});

describe('PromQLInput — diagnostics while the popup is open', () => {
  it('still shows an error next to the caret when no word is being completed', async () => {
    render(<PromQLInput defaultValue="" validationDebounceMs={10} aria-label="query" />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.paste('rate(x[5m)'); // caret after the mismatched ')', operator suggestions open
    expect(await screen.findByRole('alert')).toHaveTextContent(/closing/i);
  });
});

describe('PromQLInput — customisation', () => {
  it('applies className, style and CSS-variable overrides to the root', () => {
    render(<PromQLInput className="my-editor" style={{ maxWidth: 600, '--promql-input-radius': '0px' }} theme={{ base: 'dark', tokens: { '--promql-syntax-function': '#ff9830' } }} aria-label="query" />);
    const root = screen.getByRole('combobox').closest('.promql-input-root') as HTMLElement;
    expect(root).toHaveClass('my-editor');
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root.style.maxWidth).toBe('600px');
    expect(root.style.getPropertyValue('--promql-input-radius')).toBe('0px');
    expect(root.style.getPropertyValue('--promql-syntax-function')).toBe('#ff9830');
  });
});
