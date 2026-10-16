# Editor Component (`<PromQLInput/>`)

## Full props reference

```ts
interface PromQLInputProps {
  // Value control
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;

  // Lifecycle
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onSubmit?: (value: string) => void;         // fires on Enter when the suggestion popup is closed
  onValidation?: (result: ValidationResult) => void;
  onSuggestionError?: (error: unknown) => void; // async provider rejected

  // Input state
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  autoFocus?: boolean;

  // Suggestions
  suggestions?: SuggestionInput[];
  dynamicSuggestions?: DynamicSuggestionGroup[];
  suggestionProvider?: SuggestionProvider;
  suggestionCategories?: SuggestionCategoryConfig;
  suggestionProviderCache?: SuggestionCacheOptions | false;
  suggestionDebounceMs?: number;   // default: 80
  suggestOnEmptyFocus?: boolean;   // default: false
  trackRecentlyUsed?: boolean;     // default: false — session-local ranking boost, never persisted
  maxSuggestions?: number;         // default: 50

  // Validation
  validators?: Validator[];
  disableBuiltInValidation?: boolean;
  validationDebounceMs?: number;   // default: 150
  unknownFunctionSeverity?: 'warning' | 'error' | 'off';
  customFunctions?: string[];
  disabledFunctions?: string[];

  // Formatting
  formatOnBlur?: boolean;    // default: false
  formatOnPaste?: boolean;   // default: false — never silently rewrite a paste unless asked
  formatShortcut?: boolean;  // default: true (Shift+Alt+F / Cmd+Shift+F)
  formatOptions?: FormatOptions;

  // Bracket/quote completion
  autoCloseBrackets?: boolean; // default: true
  autoCloseQuotes?: boolean;   // default: true

  // Styling
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark' | 'system' | ThemeOverrides; // 'system' follows prefers-color-scheme
  syntaxHighlighting?: boolean; // default: true — token colouring + in-place error underlines
  classNames?: PartialSlotClassNames;
  iconMap?: Record<string, React.ReactNode>;

  // Diagnostics UI
  diagnosticsDisplay?: 'inline' | 'below' | 'none'; // default: 'below'
  maxVisibleDiagnostics?: number; // default: 3
  showValidIndicator?: boolean;   // default: false — success UI is quiet by design

  // Misc
  id?: string;
  name?: string;
  'aria-label'?: string;
  keyboardConfig?: KeyboardConfig; // per-key remap/disable
}
```

## Imperative ref API

```tsx
const ref = useRef<PromQLInputHandle>(null);

ref.current?.focus();
ref.current?.blur();
ref.current?.format();
ref.current?.getValidationResult();  // ValidationResult | null
ref.current?.insertAtCursor('foo');
ref.current?.getEditorState();        // { value, cursorPosition, selectionStart, selectionEnd }
```

## Why `<input>`, not `<textarea>`

`role="combobox"` is only ARIA-valid on a single-line textbox (the spec defines combobox as owning "a single-line textbox"; `axe-core` correctly flags it on a `<textarea>`). `formatPromQL()` in `@promql-validator/core` fully supports multi-line, indented output — useful as-is for non-UI consumers (CI linting, formatting a query before writing it to a recording-rule file) — but when the *editor component* applies formatting to its own single-line input, the result is collapsed to one line (semantics-preserving: PromQL whitespace, including newlines, isn't meaningful) rather than compromising ARIA correctness. See `collapseFormattedTextForSingleLineInput` in the source for the exact behavior.

## Keyboard

| Key | Behavior |
|---|---|
| `Arrow Down` / `Arrow Up` | Move the highlighted suggestion (wraps) |
| `Enter` | Insert the highlighted suggestion, or (popup closed) fire `onSubmit` |
| `Tab` | Insert the highlighted suggestion; never traps focus when the popup is closed |
| `Escape` | Close the popup without modifying the value; blurs on a second press when already closed |
| `Ctrl/Cmd + Space` | Force-open suggestions, even for an empty query |
| `Shift+Alt+F` / `Cmd+Shift+F` | Format |

All are remappable/disableable via the `keyboardConfig` prop, e.g. `keyboardConfig={ { Enter: false } }` to disable the Enter-to-insert behavior.
