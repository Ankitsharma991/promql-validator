# Editor Component

`<PromQLInput/>` is a single-line PromQL editor with syntax highlighting, validation, quick fixes and autocomplete. It's exported from both `promql-validator` and `@promql-validator/react`.

```tsx
import { PromQLInput } from 'promql-validator';
import 'promql-validator/styles.css';

<PromQLInput value={query} onChange={setQuery} onSubmit={runQuery} aria-label="PromQL query" />;
```

## Props

### Value and events

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `string` | | Controlled value. |
| `defaultValue` | `string` | `''` | Initial value when uncontrolled. |
| `onChange` | `(value: string) => void` | | Every edit, including inserted suggestions and quick fixes. |
| `onSubmit` | `(value: string) => void` | | Enter, when the suggestion popup is closed. |
| `onValidation` | `(result: ValidationResult) => void` | | After each debounced validation pass. |
| `onFocus` / `onBlur` | `(event) => void` | | |
| `onSuggestionError` | `(error: unknown) => void` | | Your `suggestionProvider` rejected. |

### Input state

| Prop | Type | Default |
|---|---|---|
| `placeholder` | `string` | |
| `disabled` | `boolean` | `false` |
| `readOnly` | `boolean` | `false` |
| `autoFocus` | `boolean` | |
| `id`, `name` | `string` | |
| `aria-label` | `string` | Give the editor a label, or point a `<label htmlFor>` at its `id`. |

### Validation

| Prop | Type | Default | Notes |
|---|---|---|---|
| `dialect` | `'promql' \| 'metricsql'` | `'promql'` | See [MetricsQL](./metricsql.md). |
| `validators` | `Validator[]` | | Your own rules; they run alongside the built-in ones. |
| `plugins` | `PromQLPlugin[]` | | Bundles of rules and suggestions. See [Plugins](./plugins.md). |
| `customFunctions` | `string[]` | | Function names to treat as known. |
| `disabledFunctions` | `string[]` | | Function names to reject. |
| `unknownFunctionSeverity` | `'warning' \| 'error' \| 'off'` | `'warning'` | |
| `disableBuiltInValidation` | `boolean` | `false` | Run only your `validators`. |
| `validationDebounceMs` | `number` | `150` | |
| `useWorker` | `boolean` | `false` | Run built-in validation in a Web Worker. |

### Suggestions

| Prop | Type | Default | Notes |
|---|---|---|---|
| `suggestions` | `SuggestionInput[]` | | Static suggestions (strings or objects). |
| `dynamicSuggestions` | `DynamicSuggestionGroup[]` | | Grouped values, e.g. label values. See [Dynamic suggestions](./dynamic-suggestions.md). |
| `suggestionProvider` | `SuggestionProvider` | | Async source. See [Async providers](./async-providers.md). |
| `suggestionCategories` | `SuggestionCategoryConfig` | | Enable, disable, re-rank or relabel categories (`metric`, `label-name`, …). |
| `suggestionProviderCache` | `SuggestionCacheOptions \| false` | 30 s TTL, 200 entries | In memory only. |
| `suggestionDebounceMs` | `number` | `80` | Delay before calling the async provider. |
| `maxSuggestions` | `number` | `50` | |
| `suggestionListMode` | `'ranked-cap' \| 'virtualized'` | `'ranked-cap'` | `virtualized` needs `@tanstack/react-virtual`. |
| `suggestOnEmptyFocus` | `boolean` | `false` | Open the popup on focus even when the input is empty. |
| `trackRecentlyUsed` | `boolean` | `false` | Rank recently inserted items higher (memory only). |

### Editing

| Prop | Type | Default | Notes |
|---|---|---|---|
| `autoCloseBrackets` | `boolean` | `true` | |
| `autoCloseQuotes` | `boolean` | `true` | |
| `formatShortcut` | `boolean` | `true` | `Shift+Alt+F` / `Cmd+Shift+F`. |
| `formatOnBlur` | `boolean` | `false` | |
| `formatOnPaste` | `boolean` | `false` | |
| `formatOptions` | `FormatOptions` | | See [Formatting](./formatting.md). |
| `keyboardConfig` | `KeyboardConfig` | | Turn individual keys off, e.g. `{ Tab: false }`. |

### Display

| Prop | Type | Default | Notes |
|---|---|---|---|
| `theme` | `'light' \| 'dark' \| 'system' \| ThemeOverrides` | `'light'` | See [Theming](./theming.md). |
| `syntaxHighlighting` | `boolean` | `true` | Colours tokens and underlines diagnostics in place. |
| `diagnosticsDisplay` | `'below' \| 'inline' \| 'none'` | `'below'` | `below`: underlines plus a list under the input. `inline`: underlines only (messages are still read by screen readers). `none`: no diagnostics UI; build your own from `onValidation`. |
| `maxVisibleDiagnostics` | `number` | `3` | The rest sit behind "Show N more". |
| `showValidIndicator` | `boolean` | `false` | A check icon for complete, valid queries. |
| `className`, `style` | | | Applied to the root element. |
| `classNames` | `{ root, input, popup, item, itemSelected, diagnostics, diagnosticItem }` | | Extra classes per part. |
| `iconMap` | `Record<string, ReactNode>` | | Custom icons for suggestions with an `icon` key. |

### For larger products

| Prop | Type | Notes |
|---|---|---|
| `messages` | `Partial<PromQLMessages>` | Translate or reword any UI text. See [i18n](./i18n.md). |
| `locale` | `string` | Set as `lang` on the root element. |
| `telemetryHooks` | `TelemetryHooks` | Opt-in timing and count events. See [Telemetry hooks](./telemetry.md). |
| `instanceId` | `string` | Included in telemetry events. |

## Ref API

```tsx
const ref = useRef<PromQLInputHandle>(null);

<PromQLInput ref={ref} />;

ref.current?.focus();
ref.current?.blur();
ref.current?.format();
ref.current?.insertAtCursor('sum(');
ref.current?.getValidationResult();   // ValidationResult | null
ref.current?.getEditorState();        // { value, cursorPosition, selectionStart, selectionEnd }
```

## Keyboard

| Key | Action |
|---|---|
| `↓` / `↑` | Move through suggestions (wraps) |
| `Enter` / `Tab` | Insert the highlighted suggestion. With the popup closed, `Enter` calls `onSubmit` and `Tab` moves focus as usual. |
| `Esc` | Close the popup; press again to leave the field |
| `Ctrl/Cmd + Space` | Open suggestions, even on an empty input |
| `Shift+Alt+F` / `Cmd+Shift+F` | Format |

Each can be turned off through `keyboardConfig` using the keys `ArrowDown`, `ArrowUp`, `Enter`, `Tab`, `Escape`, `forceOpen` and `format`.

## Insertion behaviour

- Functions and aggregations insert with their parentheses and the cursor inside: `rate(|)`, `sum(|)`, `time()|`. If parentheses already follow the cursor, only the name is inserted.
- A metric picked as the range argument of a function (`rate(|)`, `quantile_over_time(0.9, |)`) is inserted with a range: `rate(http_requests_total[5m])`.
- Accepting a suggestion closes the popup. It reopens when you type again or press `Ctrl/Cmd + Space`.
- While the popup is open, an error on the word you're still typing isn't shown. It appears once you finish.

## Why a single-line `<input>`

`role="combobox"` is only valid on a single-line text box, so the editor is an `<input>`. `formatPromQL()` can produce multi-line output for files and CLIs; inside the editor, formatting keeps the canonical spacing but stays on one line.

Highlighting is a separate layer drawn exactly over the input, whose own text is transparent. Focus, selection, IME input, undo and assistive technology all stay with the native element.
