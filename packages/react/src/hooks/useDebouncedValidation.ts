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
 * Debounces validation so a fast typist doesn't trigger a parse on every keystroke.
 * The debounce delay is intentionally the dominant cost here — validatePromQL() itself
 * runs in low single-digit milliseconds for realistic query lengths (Part 27.1), so this
 * is "wait for the user to pause," not "wait for computation." `workerClient` (opt-in via
 * the `useWorker` prop) is a genuinely-working escalation for hosts with unusual
 * constraints — see Part 88: not the default, since our own benchmarks show the main
 * thread isn't the bottleneck at any realistic scale.
 */
export function useDebouncedValidation(args: UseDebouncedValidationArgs): ValidationResult | null {
  return useDebouncedValidationState(args).result;
}

/** Like `useDebouncedValidation`, but also reports which `value` the result was computed for. */
export function useDebouncedValidationState(args: UseDebouncedValidationArgs): { result: ValidationResult | null; validatedValue: string | null } {
  const [state, setState] = useState<{ result: ValidationResult | null; validatedValue: string | null }>({ result: null, validatedValue: null });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { value, debounceMs, disableBuiltInValidation, validators, unknownFunctionSeverity, customFunctions, disabledFunctions, maxQueryLength, dialect, workerClient } = args;
  const setResult = (result: ValidationResult) => setState({ result, validatedValue: value });

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    let cancelled = false;

    timerRef.current = setTimeout(() => {
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
