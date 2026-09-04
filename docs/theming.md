# Theming

Pure CSS custom properties — no CSS-in-JS runtime, no forced brand identity.

```tsx
<PromQLInput theme="dark" />
<PromQLInput theme={{ base: 'dark', tokens: { '--promql-input-radius': '4px' } }} />
```

## Full token list

```css
--promql-input-background
--promql-input-text
--promql-input-border
--promql-input-border-focus
--promql-input-error
--promql-input-warning
--promql-input-placeholder
--promql-input-radius
--promql-input-padding-x
--promql-input-padding-y
--promql-input-font-family
--promql-input-font-size
--promql-suggestion-background
--promql-suggestion-background-hover
--promql-suggestion-background-selected
--promql-suggestion-text
--promql-suggestion-text-secondary
--promql-suggestion-border
--promql-diagnostics-background
--promql-diagnostics-text
```

Override any subset globally via CSS:

```css
.promql-input-root {
  --promql-input-radius: 8px;
  --promql-input-font-family: 'JetBrains Mono', monospace;
}
```

## Structural overrides

```tsx
<PromQLInput classNames={{ root: 'my-root', input: 'my-input', popup: 'my-popup', item: 'my-item', itemSelected: 'my-item-selected', diagnostics: 'my-diags' }} />
```

## Dark mode auto-detection

Not automatic by default — `theme` is host-controlled so your app's own theme state stays the single source of truth. (A `prefers-color-scheme`-driven `theme="system"` mode is a documented Future item, not yet built.)

## Contrast & reduced motion

Default tokens meet WCAG AA contrast (4.5:1 text, 3:1 UI boundaries). All transitions are CSS-only and gated behind `@media (prefers-reduced-motion: reduce)` — the component never drives animation via JS timers that could bypass that preference.
