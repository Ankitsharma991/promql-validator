import React, {
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Diagnostic,
  DynamicSuggestionGroup,
  FormatOptions,
  QuickFix,
  Suggestion,
  SuggestionCategoryConfig,
  SuggestionCacheOptions,
  SuggestionInput,
  SuggestionProvider,
  ValidationResult,
  Validator,
  formatPromQL,
  getIncompleteBracketFix,
  mergeSuggestionSources,
  mergeValidationOptions,
  mergePluginProviders,
  type PromQLPlugin,
} from '@promql-validator/core';
import { handleBackspace, handleTypedCharacter } from './bracket-pairing.js';
import { useDebouncedValidationState } from './hooks/useDebouncedValidation.js';
import { ValidationWorkerClient } from './worker-client.js';
import { useSuggestionRegistry } from './SuggestionRegistry.js';
import { useIsomorphicLayoutEffect } from './hooks/useIsomorphicLayoutEffect.js';
import { useSuggestions } from './hooks/useSuggestions.js';
import { SuggestionPopup } from './SuggestionPopup.js';
import { QueryHighlight } from './QueryHighlight.js';
import { CheckIcon } from './icons.js';
import { isMetricNameSuggestion, isRangeVectorArgSlot } from './range-slot.js';

// Loaded only when actually rendered (suggestionListMode="virtualized") — React.lazy's
// factory isn't invoked until first mount, so this line alone never pulls the optional
// @tanstack/react-virtual peer dependency into a consumer's bundle. See
// VirtualizedSuggestionPopupImpl.tsx for the full rationale.
const LazyVirtualizedSuggestionPopup = React.lazy(() => import('./VirtualizedSuggestionPopupImpl.js'));
import { DiagnosticsPanel } from './DiagnosticsPanel.js';
import { Theme, resolveTheme } from './theme/theme.js';

export interface KeyboardConfig {
  [key: string]: boolean | undefined;
}

export interface PartialSlotClassNames {
  root?: string;
  input?: string;
  popup?: string;
  item?: string;
  itemSelected?: string;
  diagnostics?: string;
  diagnosticItem?: string;
}

export interface EditorSnapshot {
  value: string;
  cursorPosition: number;
  selectionStart: number;
  selectionEnd: number;
}

export interface PromQLInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;

  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onSubmit?: (value: string) => void;
  onValidation?: (result: ValidationResult) => void;
  onSuggestionError?: (error: unknown) => void;

  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  autoFocus?: boolean;

  suggestions?: SuggestionInput[];
  dynamicSuggestions?: DynamicSuggestionGroup[];
  suggestionProvider?: SuggestionProvider;
  suggestionCategories?: SuggestionCategoryConfig;
  suggestionProviderCache?: SuggestionCacheOptions | false;
  /**
   * Distributable bundles of validators/dictionaries/suggestion sources (Part 71/72) — e.g.
   * an org's own `@my-company/promql-plugin` package. Composable with the direct props
   * above (a plugin's `validators` run *alongside* the `validators` prop, not instead of
   * it); multiple plugins' `suggestionProvider`s are combined and run concurrently.
   */
  plugins?: PromQLPlugin[];

  validators?: Validator[];
  disableBuiltInValidation?: boolean;
  validationDebounceMs?: number;
  unknownFunctionSeverity?: 'warning' | 'error' | 'off';
  customFunctions?: string[];
  disabledFunctions?: string[];
  /** Query dialect for built-in validation. Default: 'promql'. See docs/metricsql.md. */
  dialect?: 'promql' | 'metricsql';
  /**
   * Run built-in syntax/semantic validation in a Web Worker instead of the main thread.
   * Default: false — our own benchmarks show the main thread isn't the bottleneck at any
   * realistic query length, so this is an opt-in escalation for hosts with unusual
   * constraints, not a default. Falls back transparently to the main thread if unavailable
   * (SSR, older environments) or if it fails.
   */
  useWorker?: boolean;

  formatOnBlur?: boolean;
  formatOnPaste?: boolean;
  formatShortcut?: boolean;
  formatOptions?: FormatOptions;

  autoCloseBrackets?: boolean;
  autoCloseQuotes?: boolean;
  suggestionDebounceMs?: number;
  /** Open the suggestion popup on focus even when the query is empty. Default: false. */
  suggestOnEmptyFocus?: boolean;
  /**
   * Session-local (this component instance only, never persisted — Part 26 Privacy)
   * "recently used" ranking boost for inserted suggestions. Default: false.
   */
  trackRecentlyUsed?: boolean;

  className?: string;
  style?: React.CSSProperties;
  /** 'light' (default), 'dark', 'system' (follows `prefers-color-scheme`), or token overrides. */
  theme?: Theme;
  /**
   * Colour the query by token type and underline diagnostics in place. Default: true. Set to
   * false to render a plain text input (e.g. when the host applies its own text styling).
   */
  syntaxHighlighting?: boolean;
  classNames?: PartialSlotClassNames;
  iconMap?: Record<string, React.ReactNode>;

  diagnosticsDisplay?: 'inline' | 'below' | 'none';
  maxVisibleDiagnostics?: number;
  showValidIndicator?: boolean;

  id?: string;
  name?: string;
  'aria-label'?: string;
  maxSuggestions?: number;
  /**
   * 'ranked-cap' (default): only the top `maxSuggestions` (default 50) ranked results are
   * ever mounted — sufficient for the vast majority of use cases, since ranking already
   * surfaces the most relevant items. 'virtualized': renders via `@tanstack/react-virtual`
   * (an optional peer dependency — install it yourself to use this mode) for the rarer case
   * of wanting to let users scroll through hundreds/thousands of unranked-feeling results.
   */
  suggestionListMode?: 'ranked-cap' | 'virtualized';
  keyboardConfig?: KeyboardConfig;
}

export interface PromQLInputHandle {
  focus(): void;
  blur(): void;
  format(): void;
  getValidationResult(): ValidationResult | null;
  insertAtCursor(text: string): void;
  getEditorState(): EditorSnapshot;
}

let idCounter = 0;
function useStableId(prefix: string, providedId: string | undefined): string {
  const ref = useRef<string | null>(null);
  if (!ref.current) {
    ref.current = providedId ?? `${prefix}-${++idCounter}`;
  }
  return providedId ?? ref.current;
}

const NO_DIAGNOSTICS: Diagnostic[] = [];

const BRACKET_KEYS = new Set(['(', ')', '{', '}', '[', ']', '"', "'", '`']);

/**
 * The editable surface is a single-line `<input>` — the only element `role="combobox"` is
 * valid on per the ARIA spec (combobox is explicitly defined as owning "a single-line
 * textbox"; axe-core's `aria-allowed-role` rule correctly flags it on a `<textarea>`).
 * `formatPromQL()` in `@promql-validator/core` fully supports multi-line, indented output
 * (useful as-is for non-UI consumers — CLI linting, recording-rule-file formatting) but a
 * value containing `\n` can't be written into an `<input>` at all (browsers silently strip
 * newlines from `input[type=text].value`). Collapsing line breaks to a single space is
 * semantics-preserving for PromQL (whitespace, including newlines, is not meaningful
 * between tokens) — it just means the *displayed* result stays single-line in this
 * component even when the underlying formatter would have broken a long aggregation
 * across multiple lines.
 */
function collapseFormattedTextForSingleLineInput(formatted: string): string {
  return formatted.replace(/\s*\n\s*/g, ' ').trim();
}

export const PromQLInput = React.forwardRef<PromQLInputHandle, PromQLInputProps>(function PromQLInput(props, ref) {
  const {
    value: controlledValue,
    defaultValue = '',
    onChange,
    onFocus,
    onBlur,
    onSubmit,
    onValidation,
    onSuggestionError,
    disabled = false,
    readOnly = false,
    placeholder,
    autoFocus,
    suggestions,
    dynamicSuggestions,
    suggestionProvider,
    suggestionCategories,
    suggestionProviderCache,
    plugins,
    validators,
    disableBuiltInValidation = false,
    validationDebounceMs = 150,
    unknownFunctionSeverity,
    customFunctions,
    disabledFunctions,
    dialect,
    useWorker = false,
    formatOnBlur = false,
    formatOnPaste = false,
    formatShortcut = true,
    formatOptions,
    autoCloseBrackets = true,
    autoCloseQuotes = true,
    suggestionDebounceMs = 80,
    suggestOnEmptyFocus = false,
    trackRecentlyUsed = false,
    className,
    style,
    theme,
    syntaxHighlighting = true,
    classNames,
    iconMap,
    diagnosticsDisplay = 'below',
    maxVisibleDiagnostics = 3,
    showValidIndicator = false,
    id,
    name,
    'aria-label': ariaLabel,
    maxSuggestions = 50,
    suggestionListMode = 'ranked-cap',
    keyboardConfig,
  } = props;

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = isControlled ? controlledValue! : internalValue;

  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const [focused, setFocused] = useState(false);
  const [escapeClosed, setEscapeClosed] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recentlyUsedValues, setRecentlyUsedValues] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);
  const pendingSelectionRef = useRef<[number, number] | null>(null);

  const popupId = useStableId('promql-suggestions', undefined);

  const isKeyEnabled = useCallback((key: string, defaultEnabled = true) => keyboardConfig?.[key] ?? defaultEnabled, [keyboardConfig]);

  function commitValue(newValue: string, cursorStart: number, cursorEnd = cursorStart) {
    pendingSelectionRef.current = [cursorStart, cursorEnd];
    if (!isControlled) setInternalValue(newValue);
    onChange?.(newValue);
    setSelection({ start: cursorStart, end: cursorEnd });
    setEscapeClosed(false);
    setHighlightedIndex(0);
  }

  // The highlight overlay can't scroll itself, so it mirrors the input's horizontal scroll.
  function syncHighlightScroll() {
    const input = inputRef.current;
    const overlay = highlightRef.current;
    if (input && overlay) overlay.style.transform = `translateX(${-input.scrollLeft}px)`;
  }

  // Restore the caret after a programmatic value change (React resets it otherwise).
  useIsomorphicLayoutEffect(() => {
    if (pendingSelectionRef.current && inputRef.current) {
      const [s, e] = pendingSelectionRef.current;
      try {
        inputRef.current.setSelectionRange(s, e);
      } catch {
        /* ignore — some input states (e.g. type=number) disallow selection ranges; not applicable here but defensive */
      }
      pendingSelectionRef.current = null;
    }
    syncHighlightScroll();
  });

  const workerClientRef = useRef<ValidationWorkerClient | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  useEffect(() => {
    if (!useWorker) return;
    // Constructed only here (inside an effect, client-side only) — never at module scope
    // or during render, so this is inert during SSR (Part 88).
    const client = new ValidationWorkerClient();
    workerClientRef.current = client;
    setWorkerReady(client.available);
    return () => {
      client.dispose();
      workerClientRef.current = null;
    };
  }, [useWorker]);

  // Plugins compose with (never replace) the direct props above — an empty/absent
  // `plugins` array makes every merge* call here a harmless passthrough.
  const mergedValidationOptions = useMemo(
    () => mergeValidationOptions(plugins ?? [], { validators, customFunctions, disabledFunctions }),
    [plugins, validators, customFunctions, disabledFunctions],
  );

  const { result: validationResult, validatedValue } = useDebouncedValidationState({
    value,
    debounceMs: validationDebounceMs,
    disableBuiltInValidation,
    validators: mergedValidationOptions.validators,
    unknownFunctionSeverity,
    customFunctions: mergedValidationOptions.customFunctions,
    disabledFunctions: mergedValidationOptions.disabledFunctions,
    dialect,
    workerClient: useWorker ? workerClientRef.current : null,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void workerReady; // referenced only to trigger a re-render once the worker becomes available

  useEffect(() => {
    if (validationResult) onValidation?.(validationResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationResult]);

  // A per-instance prop always wins; the shared registry (if any) only fills in what
  // wasn't explicitly passed — see PromQLSuggestionRegistryProvider's docstring.
  const registry = useSuggestionRegistry();
  const effectiveSuggestions = suggestions ?? registry?.suggestions;
  const effectiveDynamicSuggestions = dynamicSuggestions ?? registry?.dynamicSuggestions;
  const effectiveSuggestionProvider = suggestionProvider ?? registry?.suggestionProvider;
  const effectiveSuggestionCategories = suggestionCategories ?? registry?.suggestionCategories;
  const effectiveSuggestionProviderCache = suggestionProviderCache ?? registry?.suggestionProviderCache;
  // Only reuse the registry's shared controller when this instance is actually using the
  // registry's provider (no per-instance override) — an instance with its own
  // suggestionProvider must get its own controller, not one wired to a different provider.
  const hasOwnProvider = Boolean(suggestionProvider) || Boolean(plugins?.some((p) => p.suggestionProvider));
  const sharedController = hasOwnProvider ? null : registry?.sharedController;

  const mergedSuggestionSources = useMemo(
    () =>
      mergeSuggestionSources(plugins ?? [], {
        suggestions: effectiveSuggestions,
        dynamicSuggestions: effectiveDynamicSuggestions,
        suggestionCategories: effectiveSuggestionCategories,
      }),
    [plugins, effectiveSuggestions, effectiveDynamicSuggestions, effectiveSuggestionCategories],
  );
  // A plugin's own provider is combined with (never overridden by) any registry/direct
  // provider — combineSuggestionProviders runs all of them concurrently.
  const mergedSuggestionProvider = useMemo(() => mergePluginProviders(plugins ?? [], effectiveSuggestionProvider), [plugins, effectiveSuggestionProvider]);

  const suggestionsEnabled = !disabled && !readOnly;
  const { context, results, loading, asyncError } = useSuggestions({
    value,
    cursorPosition: selection.start,
    suggestions: mergedSuggestionSources.suggestions,
    dynamicSuggestions: mergedSuggestionSources.dynamicSuggestions,
    suggestionProvider: mergedSuggestionProvider,
    suggestionCategories: mergedSuggestionSources.suggestionCategories,
    suggestionDebounceMs,
    suggestionProviderCache: effectiveSuggestionProviderCache,
    maxSuggestions,
    enabled: suggestionsEnabled,
    recentlyUsedValues: trackRecentlyUsed ? recentlyUsedValues : undefined,
    sharedController,
  });

  useEffect(() => {
    if (asyncError) onSuggestionError?.(asyncError);
  }, [asyncError, onSuggestionError]);

  useEffect(() => {
    setHighlightedIndex((i) => (results.length === 0 ? 0 : Math.min(i, results.length - 1)));
  }, [results.length]);

  const showPopup = focused && suggestionsEnabled && !escapeClosed && (results.length > 0 || loading) && (value.length > 0 || suggestOnEmptyFocus || forcedOpen);

  const insertSuggestion = useCallback(
    (index: number) => {
      const s: Suggestion | undefined = results[index];
      if (!s) return;
      const prefixLen = context.tokenBeforeCursor.length;
      const start = selection.start - prefixLen;
      const rest = value.slice(selection.end);
      let newValue: string;
      let newCursor: number;
      if (s.insertText && s.insertText.startsWith(`${s.value}(`) && rest.startsWith('(')) {
        // Completing a name that already has its call parentheses (e.g. editing `rat|(x)`):
        // insert just the name and step into the existing parens rather than doubling them.
        newValue = value.slice(0, start) + s.value + rest;
        newCursor = start + s.value.length + 1;
      } else if (isMetricNameSuggestion(s) && isRangeVectorArgSlot(value, start, selection.end, dialect)) {
        // A metric picked as the argument of a range function (`rate(|)`) gets a range, so
        // the result is complete and valid (`rate(metric[5m])`) rather than a type error.
        const text = `${s.insertText ?? s.value}[5m]`;
        newValue = value.slice(0, start) + text + rest;
        newCursor = start + text.length;
      } else {
        const insertText = s.insertText ?? s.value;
        const snippetIdx = insertText.indexOf('$0');
        const finalText = snippetIdx === -1 ? insertText : insertText.slice(0, snippetIdx) + insertText.slice(snippetIdx + 2);
        newCursor = snippetIdx === -1 ? start + finalText.length : start + snippetIdx;
        newValue = value.slice(0, start) + finalText + rest;
      }
      commitValue(newValue, newCursor);
      // Accepting a suggestion closes the popup until the user types again (or presses
      // Ctrl/Cmd+Space) — otherwise a second Enter would silently append another suggestion.
      setEscapeClosed(true);
      setForcedOpen(false);
      inputRef.current?.focus();
      if (trackRecentlyUsed) {
        setRecentlyUsedValues((prev) => [s.value, ...prev.filter((v) => v !== s.value)].slice(0, 20));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, context.tokenBeforeCursor, selection.start, selection.end, value, trackRecentlyUsed, dialect],
  );

  const doFormat = useCallback(() => {
    try {
      const formatted = collapseFormattedTextForSingleLineInput(formatPromQL(value, formatOptions));
      if (formatted !== value) commitValue(formatted, formatted.length);
    } catch {
      // PromQLFormatError: leave the text exactly as-is rather than guessing (Part 16.2).
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, formatOptions]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      format: doFormat,
      getValidationResult: () => validationResult,
      insertAtCursor: (text: string) => {
        const newValue = value.slice(0, selection.start) + text + value.slice(selection.end);
        commitValue(newValue, selection.start + text.length);
      },
      getEditorState: () => ({ value, cursorPosition: selection.start, selectionStart: selection.start, selectionEnd: selection.end }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doFormat, validationResult, value, selection.start, selection.end],
  );

  function syncSelectionFromDom() {
    const el = inputRef.current;
    if (!el) return;
    setSelection({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    if (!isControlled) setInternalValue(newValue);
    onChange?.(newValue);
    setEscapeClosed(false);
    syncSelectionFromDom();
  }

  function handleSelect() {
    syncSelectionFromDom();
    syncHighlightScroll();
    // Browsers may scroll a caret into view only after the select event has fired.
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(syncHighlightScroll);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (composingRef.current) return;

    const key = e.key;
    const el = inputRef.current;

    // ---- formatting shortcut ----
    if (formatShortcut && isKeyEnabled('format') && key.toLowerCase() === 'f' && e.shiftKey && (e.metaKey || (e.altKey && !e.metaKey))) {
      e.preventDefault();
      doFormat();
      return;
    }

    // ---- force-open suggestions ----
    if ((e.ctrlKey || e.metaKey) && key === ' ' && isKeyEnabled('forceOpen')) {
      e.preventDefault();
      setEscapeClosed(false);
      setForcedOpen(true);
      return;
    }

    // ---- suggestion popup navigation ----
    if (showPopup && results.length > 0) {
      if (key === 'ArrowDown' && isKeyEnabled('ArrowDown')) {
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % results.length);
        return;
      }
      if (key === 'ArrowUp' && isKeyEnabled('ArrowUp')) {
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + results.length) % results.length);
        return;
      }
      if (key === 'Enter' && isKeyEnabled('Enter')) {
        e.preventDefault();
        insertSuggestion(highlightedIndex);
        return;
      }
      if (key === 'Tab' && isKeyEnabled('Tab')) {
        e.preventDefault();
        insertSuggestion(highlightedIndex);
        return;
      }
      if (key === 'Escape' && isKeyEnabled('Escape')) {
        e.preventDefault();
        setEscapeClosed(true);
        setForcedOpen(false);
        return;
      }
    } else if (key === 'Enter' && isKeyEnabled('Enter')) {
      onSubmit?.(value);
      return;
    } else if (key === 'Escape' && isKeyEnabled('Escape')) {
      inputRef.current?.blur();
      return;
    }

    // ---- bracket / quote pairing ----
    if (!el) return;
    if (key === 'Backspace' && (autoCloseBrackets || autoCloseQuotes)) {
      const result = handleBackspace(
        { value, selectionStart: el.selectionStart ?? 0, selectionEnd: el.selectionEnd ?? 0 },
        { autoCloseBrackets, autoCloseQuotes },
      );
      if (result) {
        e.preventDefault();
        commitValue(result.value, result.cursorStart, result.cursorEnd);
        return;
      }
    }
    if (key.length === 1 && BRACKET_KEYS.has(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const result = handleTypedCharacter(
        key,
        { value, selectionStart: el.selectionStart ?? 0, selectionEnd: el.selectionEnd ?? 0 },
        { autoCloseBrackets, autoCloseQuotes },
      );
      if (result) {
        e.preventDefault();
        commitValue(result.value, result.cursorStart, result.cursorEnd);
      }
    }
  }

  function handlePaste() {
    // Auto-pairing must never double-insert into pasted content — we don't intercept the
    // paste event itself, the browser inserts verbatim. formatOnPaste (default false, an
    // explicit opt-in — silently reformatting a user's pasted query is a "fights the user"
    // violation per Part 16.3) reads the live DOM value after paste lands, not a stale
    // pre-paste closure.
    requestAnimationFrame(() => {
      if (!formatOnPaste) {
        syncSelectionFromDom();
        return;
      }
      const el = inputRef.current;
      if (!el) return;
      try {
        const formatted = collapseFormattedTextForSingleLineInput(formatPromQL(el.value, formatOptions));
        if (formatted !== el.value) {
          commitValue(formatted, formatted.length);
          return;
        }
      } catch {
        // PromQLFormatError: leave the pasted text exactly as-is.
      }
      syncSelectionFromDom();
    });
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true);
    onFocus?.(e);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false);
    setEscapeClosed(false);
    setForcedOpen(false);
    if (formatOnBlur) doFormat();
    onBlur?.(e);
  }

  // Dismiss-on-outside-click via pointerdown (avoids the focus/blur race that closes a
  // popup before a click on it registers — Part 21).
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const root = rootRef.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) {
        setFocused(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // While the user is completing a token (popup open), a diagnostic touching the caret is
  // about text they haven't finished typing — `rate(http_req|)` is momentarily an instant
  // vector. Those are held back from the UI until the popup closes; `onValidation` and
  // `getValidationResult()` still report the full result.
  const displayedDiagnostics = useMemo(() => {
    const all = validationResult?.diagnostics ?? NO_DIAGNOSTICS;
    if (!showPopup) return all;
    const caret = selection.start;
    const kept = all.filter((d) => caret < d.start || caret > d.end);
    return kept.length === all.length ? all : kept;
  }, [validationResult, showPopup, selection.start]);

  const severity: 'error' | 'warning' | undefined = useMemo(() => {
    if (displayedDiagnostics.some((d) => d.severity === 'error')) return 'error';
    if (displayedDiagnostics.some((d) => d.severity === 'warning')) return 'warning';
    return undefined;
  }, [displayedDiagnostics]);

  const { dataTheme, style: themeStyle } = resolveTheme(theme);

  function handleDiagnosticSelect(d: Diagnostic) {
    inputRef.current?.focus();
    pendingSelectionRef.current = [d.start, d.end];
    setSelection({ start: d.start, end: d.end });
  }

  function applyFix(fix: QuickFix) {
    const applied = fix.apply(value);
    commitValue(applied.value, applied.cursorPosition);
    inputRef.current?.focus();
  }

  // Diagnostic-anchored fixes carry offsets into the text they were computed for; with
  // debounced validation that can briefly lag the live value, so they only apply once
  // validation has caught up (otherwise the edit could land in the wrong place).
  function applyDiagnosticFix(fix: QuickFix) {
    if (validatedValue !== value) return;
    const applied = fix.apply(value);
    commitValue(applied.value, applied.cursorPosition);
    inputRef.current?.focus();
  }

  const incompleteBracketFix = validationResult ? getIncompleteBracketFix(validationResult, value) : null;

  // Diagnostics are debounced; offsets from a stale result would underline the wrong text, so
  // in-place underlines only show once validation has caught up with the current value.
  const highlightDiagnostics = useMemo(
    () => (validationResult && validatedValue === value ? displayedDiagnostics : NO_DIAGNOSTICS),
    [validationResult, validatedValue, value, displayedDiagnostics],
  );

  const activeDescendant = showPopup && results[highlightedIndex] ? `${popupId}-option-${highlightedIndex}` : undefined;

  return (
    <div ref={rootRef} className={`promql-input-root ${classNames?.root ?? ''} ${className ?? ''}`.trim()} data-theme={dataTheme} style={{ ...themeStyle, ...style }}>
      <div className="promql-input-box" data-severity={severity} data-disabled={disabled}>
        <div className="promql-input-field" data-highlighted={syntaxHighlighting || undefined}>
          {syntaxHighlighting && <QueryHighlight ref={highlightRef} value={value} diagnostics={highlightDiagnostics} />}
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            role="combobox"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-expanded={showPopup}
            aria-controls={popupId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
            aria-label={ariaLabel}
            aria-disabled={disabled || undefined}
            className={`promql-input-textbox ${classNames?.input ?? ''}`.trim()}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onPaste={handlePaste}
            onScroll={syncHighlightScroll}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
              syncSelectionFromDom();
            }}
          />
        </div>
        {showValidIndicator && severity === undefined && validationResult && !validationResult.incomplete && validationResult.diagnostics.length === 0 && (
          <span className="promql-valid-indicator" aria-hidden="true" title="Valid query">
            <CheckIcon />
          </span>
        )}
      </div>

      {showPopup && suggestionListMode === 'virtualized' && (
        <Suspense fallback={null}>
          <LazyVirtualizedSuggestionPopup
            id={popupId}
            suggestions={results}
            highlightedIndex={highlightedIndex}
            loading={loading}
            asyncError={asyncError}
            onHover={setHighlightedIndex}
            onSelect={insertSuggestion}
            iconMap={iconMap}
            classNames={classNames}
            matchText={context.tokenBeforeCursor}
          />
        </Suspense>
      )}
      {showPopup && suggestionListMode !== 'virtualized' && (
        <SuggestionPopup
          ref={popupRef}
          id={popupId}
          suggestions={results}
          highlightedIndex={highlightedIndex}
          loading={loading}
          asyncError={asyncError}
          onHover={setHighlightedIndex}
          onSelect={insertSuggestion}
          iconMap={iconMap}
          classNames={classNames}
          matchText={context.tokenBeforeCursor}
        />
      )}

      <span className="promql-visually-hidden" aria-live="polite">
        {showPopup ? `${results.length} suggestions available` : ''}
      </span>

      {diagnosticsDisplay !== 'none' && validationResult && (
        <DiagnosticsPanel query={validatedValue ?? value} diagnostics={displayedDiagnostics} maxVisible={maxVisibleDiagnostics} onSelect={handleDiagnosticSelect} onApplyFix={applyDiagnosticFix} classNames={classNames} />
      )}
      {diagnosticsDisplay !== 'none' && incompleteBracketFix && (
        <div className="promql-incomplete-hint">
          <button type="button" className="promql-diagnostic-fix" onClick={() => applyFix(incompleteBracketFix)}>
            {incompleteBracketFix.label}
          </button>
        </div>
      )}
    </div>
  );
});
