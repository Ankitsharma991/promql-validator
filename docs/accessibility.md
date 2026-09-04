# Accessibility

Target: WCAG 2.1 AA. Automated (`jest-axe`, run against every documented component state — empty, valid, invalid, warning, popup-open, disabled, read-only, dark theme) as a blocking CI gate, not a periodic manual audit only.

## What's built in

- **Correct ARIA combobox pattern**: `role="combobox"` on the input, `aria-expanded`, `aria-controls` pointing at the popup, `aria-autocomplete="list"`, `aria-activedescendant` tracking the highlighted option; the popup is `role="listbox"` with `role="option"`/`aria-selected` children.
- **Full keyboard operability** — see [Editor Component](./editor-component.md#keyboard). No functionality requires a mouse.
- **Screen-reader announcements**: a visually-hidden `aria-live="polite"` region announces the suggestion count on popup open/update; the diagnostics panel is `role="alert"`/`aria-live="polite"`, debounced so it doesn't spam an announcement per keystroke.
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
