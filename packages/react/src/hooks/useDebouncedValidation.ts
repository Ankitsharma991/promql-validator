import { useEffect, useRef, useState } from 'react';
import { parsePromQL, validatePromQL, ValidationOptions, ValidationResult, Validator } from '@promql-validator/core';
import type { ValidationWorkerClient } from '../worker-client.js';

export interface UseDebouncedValidationArgs {
  value: string;
  debounceMs: number;
  disableBuiltInValidation?: boolean;
  validators?: Validator[];
  unknownFunctionSeverity?: ValidationOptions['unknownFunctionSeverity'];
  customFunctions?: string[];
  disabledFunctions?: string[];
  maxQueryLength?: number;
  dialect?: ValidationOptions['dialect'];
  /** When set and available, built-in syntax/semantic validation runs off the main thread. */
  workerClient?: ValidationWorkerClient | null;
}

/**
 * Debounces validation so a fast typist doesn't trigger a parse on every keystroke. The
 * delay is about waiting for the user to pause, not for computation: validatePromQL() runs
 * in low single-digit milliseconds for realistic queries. `workerClient` (the `useWorker`
 * prop) moves the built-in pass off the main thread for hosts that need it.
 */
export function useDebouncedValidation(args: UseDebouncedValidationArgs): ValidationResult | null {
  return useDebouncedValidationState(args).result;
}

export interface DebouncedValidationState {
  result: ValidationResult | null;
  /** The value `result` was computed for (validation is debounced, so it can lag behind). */
  validatedValue: string | null;
  /** How long the validation itself took, excluding the debounce delay. */
  durationMs: number;
}

/** Like `useDebouncedValidation`, but also reports which value was validated and how long it took. */
export function useDebouncedValidationState(args: UseDebouncedValidationArgs): DebouncedValidationState {
  const [state, setState] = useState<DebouncedValidationState>({ result: null, validatedValue: null, durationMs: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { value, debounceMs, disableBuiltInValidation, validators, unknownFunctionSeverity, customFunctions, disabledFunctions, maxQueryLength, dialect, workerClient } = args;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    let cancelled = false;

    timerRef.current = setTimeout(() => {
      const startedAt = now();
      const setResult = (result: ValidationResult) => setState({ result, validatedValue: value, durationMs: now() - startedAt });
      const options: ValidationOptions = { disableBuiltInValidation, unknownFunctionSeverity, customFunctions, disabledFunctions, maxQueryLength, dialect };

      if (workerClient?.available && !disableBuiltInValidation) {
        // Function values (`validators`) can't cross a postMessage boundary, so custom
        // validators still run on the main thread against a fresh (cheap, sub-ms) parse —
        // only the built-in syntax/semantic pass is actually offloaded.
        workerClient
          .validate(value, options)
          .then((builtIn) => {
            if (cancelled) return;
            if (!validators || validators.length === 0) {
              setResult(builtIn);
              return;
            }
            const { ast } = parsePromQL(value, dialect);
            const customDiagnostics = validators.flatMap((v) => v(ast, value));
            setResult({
              valid: builtIn.valid && !customDiagnostics.some((d) => d.severity === 'error'),
              incomplete: builtIn.incomplete,
              diagnostics: [...builtIn.diagnostics, ...customDiagnostics],
            });
          })
          .catch(() => {
            // Worker failed (terminated, unsupported, etc.) — fall back to the normal
            // synchronous path rather than leaving validation permanently stuck.
            if (!cancelled) setResult(validatePromQL(value, { ...options, validators }));
          });
        return;
      }

      setResult(validatePromQL(value, { ...options, validators }));
    }, debounceMs);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // validators/etc. are typically stable references from the host; re-validating on
    // every render would defeat the debounce, so we intentionally key off `value` and
    // the primitive options only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs, disableBuiltInValidation, unknownFunctionSeverity, maxQueryLength, dialect, workerClient]);

  return state;
}
