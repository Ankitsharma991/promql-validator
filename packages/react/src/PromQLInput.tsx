import React, {
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
  Suggestion,
  SuggestionCategoryConfig,
  SuggestionCacheOptions,
  SuggestionInput,
  SuggestionProvider,
  ValidationResult,
  Validator,
  formatPromQL,
} from '@promql-validator/core';
import { handleBackspace, handleTypedCharacter } from './bracket-pairing.js';
import { useDebouncedValidation } from './hooks/useDebouncedValidation.js';
import { useIsomorphicLayoutEffect } from './hooks/useIsomorphicLayoutEffect.js';
import { useSuggestions } from './hooks/useSuggestions.js';
import { SuggestionPopup } from './SuggestionPopup.js';
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

  validators?: Validator[];
  disableBuiltInValidation?: boolean;
  validationDebounceMs?: number;
  unknownFunctionSeverity?: 'warning' | 'error' | 'off';
  customFunctions?: string[];
  disabledFunctions?: string[];

  formatOnBlur?: boolean;
  formatShortcut?: boolean;
  formatOptions?: FormatOptions;

  autoCloseBrackets?: boolean;
  autoCloseQuotes?: boolean;
  suggestionDebounceMs?: number;

  className?: string;
  style?: React.CSSProperties;
  theme?: Theme;
  classNames?: PartialSlotClassNames;
  iconMap?: Record<string, React.ReactNode>;

  diagnosticsDisplay?: 'inline' | 'below' | 'none';
  maxVisibleDiagnostics?: number;
  showValidIndicator?: boolean;

  id?: string;
  name?: string;
  'aria-label'?: string;
  maxSuggestions?: number;
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

const BRACKET_KEYS = new Set(['(', ')', '{', '}', '[', ']', '"', "'", '`']);

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
    validators,
    disableBuiltInValidation = false,
    validationDebounceMs = 150,
    unknownFunctionSeverity,
    customFunctions,
    disabledFunctions,
    formatOnBlur = false,
    formatShortcut = true,
    formatOptions,
    autoCloseBrackets = true,
    autoCloseQuotes = true,
    suggestionDebounceMs = 80,
    className,
    style,
    theme,
    classNames,
    iconMap,
    diagnosticsDisplay = 'below',
    maxVisibleDiagnostics = 3,
    showValidIndicator = false,
    id,
    name,
    'aria-label': ariaLabel,
    maxSuggestions = 50,
    keyboardConfig,
  } = props;

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = isControlled ? controlledValue! : internalValue;

  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const [focused, setFocused] = useState(false);
  const [escapeClosed, setEscapeClosed] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
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
  });

  const validationResult = useDebouncedValidation({
    value,
    debounceMs: validationDebounceMs,
    disableBuiltInValidation,
    validators,
    unknownFunctionSeverity,
    customFunctions,
    disabledFunctions,
  });

  useEffect(() => {
    if (validationResult) onValidation?.(validationResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationResult]);

  const suggestionsEnabled = !disabled && !readOnly;
  const { context, results, loading, asyncError } = useSuggestions({
    value,
    cursorPosition: selection.start,
    suggestions,
    dynamicSuggestions,
    suggestionProvider,
    suggestionCategories,
    suggestionDebounceMs,
    suggestionProviderCache,
    maxSuggestions,
    enabled: suggestionsEnabled,
  });

  useEffect(() => {
    if (asyncError) onSuggestionError?.(asyncError);
  }, [asyncError, onSuggestionError]);

  useEffect(() => {
    setHighlightedIndex((i) => (results.length === 0 ? 0 : Math.min(i, results.length - 1)));
  }, [results.length]);

  const showPopup = focused && suggestionsEnabled && !escapeClosed && (results.length > 0 || loading);

  const insertSuggestion = useCallback(
    (index: number) => {
      const s: Suggestion | undefined = results[index];
      if (!s) return;
      const insertText = s.insertText ?? s.value;
      const prefixLen = context.tokenBeforeCursor.length;
      const start = selection.start - prefixLen;
      const snippetIdx = insertText.indexOf('$0');
      const finalText = snippetIdx === -1 ? insertText : insertText.slice(0, snippetIdx) + insertText.slice(snippetIdx + 2);
      const newCursor = snippetIdx === -1 ? start + finalText.length : start + snippetIdx;
      const newValue = value.slice(0, start) + finalText + value.slice(selection.end);
      commitValue(newValue, newCursor);
      inputRef.current?.focus();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, context.tokenBeforeCursor, selection.start, selection.end, value],
  );

  const doFormat = useCallback(() => {
    try {
      const formatted = formatPromQL(value, formatOptions);
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
    // Auto-pairing must never double-insert into pasted content — nothing to do here;
    // the browser's native paste already inserts verbatim since we don't intercept it.
    requestAnimationFrame(syncSelectionFromDom);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true);
    onFocus?.(e);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false);
    setEscapeClosed(false);
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

  const severity: 'error' | 'warning' | undefined = useMemo(() => {
    if (!validationResult) return undefined;
    if (validationResult.diagnostics.some((d) => d.severity === 'error')) return 'error';
    if (validationResult.diagnostics.some((d) => d.severity === 'warning')) return 'warning';
    return undefined;
  }, [validationResult]);

  const { dataTheme, style: themeStyle } = resolveTheme(theme);

  function handleDiagnosticSelect(d: Diagnostic) {
    inputRef.current?.focus();
    pendingSelectionRef.current = [d.start, d.end];
    setSelection({ start: d.start, end: d.end });
  }

  const activeDescendant = showPopup && results[highlightedIndex] ? `${popupId}-option-${highlightedIndex}` : undefined;

  return (
    <div ref={rootRef} className={`promql-input-root ${classNames?.root ?? ''} ${className ?? ''}`.trim()} data-theme={dataTheme} style={{ ...themeStyle, ...style }}>
      <div className="promql-input-box" data-severity={severity} data-disabled={disabled}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
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
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
            syncSelectionFromDom();
          }}
        />
        {showValidIndicator && severity === undefined && validationResult && validationResult.diagnostics.length === 0 && (
          <span aria-hidden="true" title="Valid query">
            ✓
          </span>
        )}
      </div>

      {showPopup && (
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
        />
      )}

      <span className="promql-visually-hidden" aria-live="polite">
        {showPopup ? `${results.length} suggestions available` : ''}
      </span>

      {diagnosticsDisplay !== 'none' && validationResult && (
        <DiagnosticsPanel diagnostics={validationResult.diagnostics} maxVisible={maxVisibleDiagnostics} onSelect={handleDiagnosticSelect} classNames={classNames} />
      )}
    </div>
  );
});
