# Theming

Everything visual is a CSS custom property on `.promql-input-root`. There's no CSS-in-JS runtime and no brand colour baked in.

## Default styles

The component adds its stylesheet to the page the first time it renders, as a single `<style id="promql-validator-styles">` placed **first** in `<head>`. Your own stylesheets come after it, so plain CSS overrides work without `!important` or extra specificity.

| Situation | What to do |
|---|---|
| Normal app | Nothing; styles are automatic. |
| Content-Security-Policy with nonces | `<PromQLInput styleNonce={nonce} />` |
| CSP that forbids inline styles | `import 'promql-validator/styles.css'` and `<PromQLInput injectStyles={false} />` |
| Server rendering without a flash of unstyled content | Render the stylesheet in `<head>` yourself (below). The component sees it and won't add another. |

```tsx
import { promqlStylesheet } from 'promql-validator';

// in your document <head>; it's the package's own static CSS. Passed as plain
// children, React would escape the `>` in its selectors.
<style id="promql-validator-styles" dangerouslySetInnerHTML={{ __html: promqlStylesheet }} />
```

## Themes and tokens

```tsx
<PromQLInput theme="light" />   {/* default */}
<PromQLInput theme="dark" />
<PromQLInput theme="system" />  {/* follows prefers-color-scheme */}
<PromQLInput theme={{ base: 'dark', tokens: { '--promql-input-radius': '4px', '--promql-syntax-function': '#ff9830' } }} />
```

`theme` is under your control, so your app's own theme state stays the source of truth. Use `'system'` if you simply want to follow the operating system.

Or set them per instance with `style`, which accepts CSS variables:

```tsx
<PromQLInput className="query-box" style={{ maxWidth: 640, '--promql-input-radius': '0px' }} />
```

You can also override tokens globally in CSS:

```css
.promql-input-root {
  --promql-input-radius: 8px;
  --promql-input-font-family: 'JetBrains Mono', monospace;
  --promql-input-border-focus: #f46800;
}

/* only in your dark theme */
.my-app.dark .promql-input-root {
  --promql-input-background: #181b1f;
}
```

## Tokens

### Input

| Token | Purpose |
|---|---|
| `--promql-input-background`, `--promql-input-text` | Field colours |
| `--promql-input-border`, `--promql-input-border-hover`, `--promql-input-border-focus` | Border states |
| `--promql-input-focus-ring`, `--promql-input-error-ring` | Focus ring (normal / with an error) |
| `--promql-input-error`, `--promql-input-warning`, `--promql-input-info`, `--promql-input-success` | Status colours (borders, underlines, valid icon) |
| `--promql-input-placeholder`, `--promql-input-selection` | Placeholder and text-selection colours |
| `--promql-input-radius`, `--promql-input-height`, `--promql-input-padding-x`, `--promql-input-padding-y` | Shape and size |
| `--promql-input-font-family`, `--promql-input-font-size`, `--promql-input-line-height` | Code font |
| `--promql-ui-font-family`, `--promql-ui-font-size` | Font for popups and messages |

### Syntax highlighting

`--promql-syntax-metric`, `--promql-syntax-function`, `--promql-syntax-keyword`, `--promql-syntax-label`, `--promql-syntax-string`, `--promql-syntax-number`, `--promql-syntax-duration`, `--promql-syntax-operator`, `--promql-syntax-punctuation`, `--promql-syntax-comment`

### Suggestion popup

| Token | Purpose |
|---|---|
| `--promql-suggestion-background`, `--promql-suggestion-text`, `--promql-suggestion-text-secondary` | Base colours |
| `--promql-suggestion-background-hover`, `--promql-suggestion-background-selected` | Row states |
| `--promql-suggestion-match` | Highlighted matching characters |
| `--promql-suggestion-border`, `--promql-suggestion-divider`, `--promql-suggestion-surface`, `--promql-suggestion-shadow` | Frame, separators, footer |
| `--promql-suggestion-max-height`, `--promql-suggestion-item-height` | Sizing |

Kind badge colours: `--promql-kind-function`, `--promql-kind-aggregation`, `--promql-kind-operator`, `--promql-kind-keyword`, `--promql-kind-duration`, `--promql-kind-label`, `--promql-kind-metric`, `--promql-kind-value`, `--promql-kind-term`, `--promql-kind-custom`

### Diagnostics

`--promql-diagnostics-background`, `--promql-diagnostics-border`, `--promql-diagnostics-text`, and the same three with `-warning-` and `-info-` in the name (for example `--promql-diagnostics-warning-background`).

## Class names

Each part has a stable class (`promql-input-root`, `promql-input-box`, `promql-suggestion-popup`, `promql-suggestion-item`, `promql-diagnostic-item`, …), and you can add your own:

```tsx
<PromQLInput classNames={{ root: 'my-root', input: 'my-input', popup: 'my-popup', item: 'my-item', itemSelected: 'my-item-active', diagnostics: 'my-diags', diagnosticItem: 'my-diag' }} />
```

State is exposed through data attributes for styling: `data-theme` on the root, `data-severity` on the box and diagnostic rows, `data-selected` on suggestion rows, `data-kind` on suggestion badges.

## Contrast and motion

The default light and dark palettes meet WCAG AA contrast. Animations are CSS-only and turned off under `prefers-reduced-motion: reduce`. In Windows high-contrast mode (`forced-colors: active`), the highlight layer is hidden and the input falls back to system colours.
