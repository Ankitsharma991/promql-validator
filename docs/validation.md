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
  dialect?: 'promql' | 'metricsql';      // default: 'promql' (any other value throws UnsupportedDialectError)
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

The same applies to the *unfilled slots* that auto-closed brackets leave behind — `rate()`, `sum()`, `topk(5, )`, `histogram_quantile(0.95, )`, `metric[]` — since `rate()` is exactly what typing `rate(` produces in an editor that closes brackets. Functions that take no arguments (`time()`, `pi()`) are complete. Before treating a query as final (e.g. on submit), check **both** flags: `valid && !incomplete`.

## One error per mistake

After the first syntax error the parser is recovering, and anything it reports afterwards is almost always a consequence of that one mistake. Like Prometheus, `validatePromQL` reports only the **first** syntax error (non-error syntax findings such as duplicate-matcher warnings are kept), and runs semantic checks only once the syntax is clean.

## Quick fixes

`getQuickFix(diagnostic, query?)` returns a one-click fix when one can be derived with confidence. Pass the query the diagnostic was computed for to enable fixes that depend on the surrounding text — e.g. `rate(up)` → *Add range '[5m]'* → `rate(up[5m])`, offered only when the argument is a plain selector.

## What's checked

See [PromQL support](./syntax-support.md) for the full list of syntax and semantic rules. The behaviour is pinned down by a conformance corpus (`packages/core/conformance/promql.json`) of queries labelled with the verdict Prometheus gives them, run on every test pass.

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

## Linting rule files in CI

Use the [CLI](./cli.md), or call the core directly from a Node script:

```ts
import { readFileSync } from 'node:fs';
import { validateRecordingRuleFile } from '@promql-validator/core';

const { valid, entries } = validateRecordingRuleFile(readFileSync('rules.yml', 'utf8'));
for (const entry of entries) {
  if (!entry.result.valid) console.error(`${entry.ruleName} (line ${entry.line})`, entry.result.diagnostics);
}
process.exitCode = valid ? 0 : 1;
```
