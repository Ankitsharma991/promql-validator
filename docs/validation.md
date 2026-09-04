# Validation

## API

```ts
function validatePromQL(query: string, options?: ValidationOptions): ValidationResult;

interface ValidationResult {
  valid: boolean;       // true iff no 'error'-severity diagnostics
  diagnostics: Diagnostic[];
  incomplete: boolean;  // true for a structurally-incomplete-but-expected mid-typing state
}

interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  code: string;          // stable, see docs/diagnostic-codes.md
  start: number; end: number;   // character offsets
  line: number; column: number; // 1-based
  suggestion?: string;    // e.g. "Did you mean 'rate'?"
}
```

## Options

```ts
interface ValidationOptions {
  validators?: Validator[];              // custom validators, run alongside the built-in one
  disableBuiltInValidation?: boolean;    // escape hatch for a fully custom pipeline
  unknownFunctionSeverity?: 'warning' | 'error' | 'off'; // default: 'warning'
  customFunctions?: string[];            // extend the built-in function dictionary
  disabledFunctions?: string[];          // remove functions your org has banned
  maxQueryLength?: number;               // default: 10000 — beyond this, live validation is skipped
  dialect?: 'promql' | 'metricsql';      // default: 'promql'; 'metricsql' throws UnsupportedDialectError today
}
```

## Why unknown functions are warnings, not errors

Prometheus ships new functions regularly, and some deployments run a fork or an older/newer version than this package's bundled dictionary. Treating an unrecognized-but-syntactically-valid call as a `warning` avoids blocking a legitimately valid, newer-than-our-dictionary query. Set `unknownFunctionSeverity: 'error'` if you want strict-mode behavior instead.

## Incomplete states are not errors

```ts
validatePromQL('rate(');
// { valid: true, incomplete: true, diagnostics: [] }
```

`rate(`, `sum(`, `metric{`, `metric{label=`, `sum by (` are structurally-incomplete-but-expected mid-typing states — the parser has explicit error-recovery productions for exactly this (see [Architecture](./architecture.md)), and reports `incomplete: true` with **no error diagnostic** for the incompleteness itself. A genuinely malformed query (`rate(metric[5m)`, mismatched bracket types) still reports real `error` diagnostics.

## Custom validators

```ts
import { validatePromQL, type Validator } from '@promql-validator/core';

const forbidUnboundedMatch: Validator = (ast, query) => {
  if (query.includes('__name__=~".*"')) {
    return [{ severity: 'warning', code: 'ORG_UNBOUNDED_MATCH', message: 'Matching all metrics is expensive.', start: 0, end: query.length, line: 1, column: 1 }];
  }
  return [];
};

validatePromQL(query, { validators: [forbidUnboundedMatch] });
```

Custom validators receive the already-parsed AST (no redundant parsing) and run **in addition to** the built-in one — `disableBuiltInValidation` is the true opt-out, for hosts building a fully custom pipeline.

## Linting recording rules in CI

`validatePromQL` needs no DOM/React, so it works directly in a Node script:

```ts
import { validatePromQL } from '@promql-validator/core';
import { readFileSync } from 'node:fs';

const exprs = extractExprFieldsFromYourRuleFile(readFileSync('rules.yml', 'utf8'));
for (const expr of exprs) {
  const result = validatePromQL(expr);
  if (!result.valid) {
    console.error(expr, result.diagnostics);
    process.exitCode = 1;
  }
}
```
