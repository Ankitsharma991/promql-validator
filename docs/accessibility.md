# Accessibility

Target: WCAG 2.1 AA. Automated (`jest-axe`, run against every documented component state — empty, valid, invalid, warning, popup-open, disabled, read-only, dark theme) as a blocking CI gate, not a periodic manual audit only.

## What's built in

- **Correct ARIA combobox pattern**: `role="combobox"` on the input, `aria-expanded`, `aria-controls` pointing at the popup, `aria-autocomplete="list"`, `aria-activedescendant` tracking the highlighted option; the popup is `role="listbox"` with `role="option"`/`aria-selected` children.
- **Full keyboard operability** — see [Editor Component](./editor-component.md#keyboard). No functionality requires a mouse.
- **Screen-reader announcements**: a visually-hidden `aria-live="polite"` region announces the suggestion count when the popup opens or changes, and the diagnostics list is `role="alert"`/`aria-live="polite"` (validation is debounced, so it doesn't announce on every keystroke).
- **Errors on the input itself**: `aria-invalid` is set when the query has an error. With `diagnosticsDisplay="inline"`, the messages are attached to the input through `aria-describedby`.
- **Highlighting doesn't get in the way**: the coloured layer is `aria-hidden` and draws its text with CSS, so assistive technology, find-in-page and text selection only ever see the real input. Suggestion details are linked to the highlighted option with `aria-describedby`.
- **Forced colours**: in Windows high-contrast mode the highlight layer is hidden and system colours are used.
- **Focus management**: focus never silently jumps during typing/suggestion interaction; only explicit actions (Tab-out, Escape-then-Escape, programmatic blur) move it.
- **Disabled state** uses the native `disabled` attribute (excluded from tab order per native semantics), not just visual styling.
- **Reduced motion**: all transitions are CSS-only, gated behind `@media (prefers-reduced-motion: reduce)`.
- **Contrast**: default theme tokens meet 4.5:1 (text) / 3:1 (UI boundaries).

## What you still need to ensure

- An `aria-label` (or an associated `<label>` via `id`/`htmlFor`) — the component doesn't guess a label for you.
- Sufficient contrast if you override the default theme tokens.
- If you build a custom `iconMap`, icons should be decorative (the component already marks them `aria-hidden`) — don't rely on an icon alone to convey meaning not otherwise in `label`/`description`.

## Why `<input>`, not `<textarea>`

See [Editor Component](./editor-component.md#why-input-not-textarea) — `role="combobox"` is only valid on a single-line textbox per the ARIA spec; this is verified by the automated axe suite, not just asserted.
