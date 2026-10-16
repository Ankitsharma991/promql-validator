# @promql-validator/react

`<PromQLInput/>`: an accessible, themeable React editor for PromQL with live syntax highlighting, validation, quick fixes and context-aware autocomplete. Built on [`@promql-validator/core`](https://www.npmjs.com/package/@promql-validator/core).

> Most apps should install [`promql-validator`](https://www.npmjs.com/package/promql-validator), which re-exports this package along with core and adds a CLI. Install this one directly if you want the component without the CLI.

```bash
npm install @promql-validator/react
```

```tsx
import { PromQLInput } from '@promql-validator/react';
import '@promql-validator/react/styles.css';

<PromQLInput
  value={query}
  onChange={setQuery}
  onSubmit={runQuery}
  dynamicSuggestions={[{ category: 'job', values: jobs }]}
  theme="system"
  aria-label="PromQL query"
/>;
```

Peer dependencies: `react` and `react-dom` 18 or newer. `@tanstack/react-virtual` is an optional peer, needed only for `suggestionListMode="virtualized"`.

## What you get

- Syntax highlighting with wavy underlines on errors and warnings, drawn over a native `<input>`.
- A suggestion popup with kind badges (function, metric, label, value…), match highlighting, a docs pane and keyboard hints.
- Functions insert as `rate(|)`. A metric picked inside a range function becomes `rate(metric[5m])`.
- Diagnostics with severity icons, `line:column` positions and one-click quick fixes.
- Bracket and quote auto-closing, formatting (`Shift+Alt+F` / `Cmd+Shift+F`), `onSubmit` on Enter.
- Light, dark and `system` themes, with 64 CSS variables for full control.
- ARIA combobox, full keyboard support and screen-reader announcements, axe-tested.
- SSR-safe: no `window`/`document` access during render or import.

## Exports

| Export | |
|---|---|
| `PromQLInput` | The editor component. Accepts a ref (`PromQLInputHandle`): `focus`, `blur`, `format`, `insertAtCursor`, `getValidationResult`, `getEditorState`. |
| `PromQLValidatorProvider` | Shares suggestions, an async provider (with one cache) and plugins across every editor below it. Also exported as `PromQLSuggestionRegistryProvider`. |
| `defaultMessages`, `PromQLMessages` | The UI string catalog, for translation. |
| `TelemetryHooks` | Type for the opt-in `telemetryHooks` prop. |
| `ValidationWorkerClient` | Runs validation in a Web Worker (used by the `useWorker` prop). |
| everything from `@promql-validator/core` | `validatePromQL`, `formatPromQL`, `getSuggestions`, … |

## Props at a glance

**Value**: `value`, `defaultValue`, `onChange`, `onSubmit`, `onFocus`, `onBlur`, `placeholder`, `disabled`, `readOnly`, `autoFocus`, `id`, `name`, `aria-label`.

**Validation**: `onValidation`, `validators`, `plugins`, `dialect`, `customFunctions`, `disabledFunctions`, `unknownFunctionSeverity`, `disableBuiltInValidation`, `validationDebounceMs` (150), `useWorker`.

**Suggestions**: `suggestions`, `dynamicSuggestions`, `suggestionProvider`, `suggestionCategories`, `suggestionProviderCache`, `suggestionDebounceMs` (80), `maxSuggestions` (50), `suggestionListMode`, `suggestOnEmptyFocus`, `trackRecentlyUsed`, `onSuggestionError`.

**Editing**: `autoCloseBrackets`, `autoCloseQuotes`, `formatShortcut`, `formatOnBlur`, `formatOnPaste`, `formatOptions`, `keyboardConfig`.

**Display**: `theme`, `syntaxHighlighting`, `diagnosticsDisplay`, `maxVisibleDiagnostics`, `showValidIndicator`, `className`, `classNames`, `style`, `iconMap`.

**Product**: `messages`, `locale`, `telemetryHooks`, `instanceId`.

Every prop is documented with types and defaults in the [editor component guide](https://github.com/Ankitsharma991/promql-validator/blob/main/docs/editor-component.md).

## Documentation

**<https://github.com/Ankitsharma991/promql-validator>**

## Author

**Ankit Sharma**: [GitHub](https://github.com/Ankitsharma991) · [Portfolio](https://ankitsharma991.com.np) · [sharmaa7861@gmail.com](mailto:sharmaa7861@gmail.com)

## License

MIT © Ankit Sharma
