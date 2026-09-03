import { useEffect, useRef, useState } from 'react';
import { validatePromQL, ValidationOptions, ValidationResult, Validator } from '@promql-validator/core';

export interface UseDebouncedValidationArgs {
  value: string;
  debounceMs: number;
  disableBuiltInValidation?: boolean;
  validators?: Validator[];
  unknownFunctionSeverity?: ValidationOptions['unknownFunctionSeverity'];
  customFunctions?: string[];
  disabledFunctions?: string[];
  maxQueryLength?: number;
}

/**
 * Debounces validation so a fast typist doesn't trigger a parse on every keystroke.
 * The debounce delay is intentionally the dominant cost here — validatePromQL() itself
 * runs in low single-digit milliseconds for realistic query lengths (Part 27.1), so this
 * is "wait for the user to pause," not "wait for computation."
 */
export function useDebouncedValidation(args: UseDebouncedValidationArgs): ValidationResult | null {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { value, debounceMs, disableBuiltInValidation, validators, unknownFunctionSeverity, customFunctions, disabledFunctions, maxQueryLength } = args;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setResult(
        validatePromQL(value, {
          disableBuiltInValidation,
          validators,
          unknownFunctionSeverity,
          customFunctions,
          disabledFunctions,
          maxQueryLength,
        }),
      );
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // validators/etc. are typically stable references from the host; re-validating on
    // every render would defeat the debounce, so we intentionally key off `value` and
    // the primitive options only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs, disableBuiltInValidation, unknownFunctionSeverity, maxQueryLength]);

  return result;
}
