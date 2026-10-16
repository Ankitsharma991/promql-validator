---
name: Bug report
about: Something doesn't work the way it should
title: ''
labels: bug
assignees: ''
---

## Minimal reproducing query

**Required.** The exact query string that triggers the bug (or the smallest one you can reduce it to). Grammar-correctness reports without a concrete query can't be reliably investigated or turned into a regression test.

```
paste the exact query here
```

## Expected behavior

What should have happened (e.g. "should be `valid: true`", "should suggest `rate` here", "should not throw").

## Actual behavior

What actually happened — the real `ValidationResult`/`Suggestion[]`/error, not a paraphrase. If it's a validation issue, please include the full output of:

```ts
console.log(JSON.stringify(validatePromQL('your query here'), null, 2));
```

## Environment

- `@promql-validator/core` / `@promql-validator/react` version:
- Node version (if server-side) or browser + version (if in an editor):
- Framework (React/Next.js/Vite/Monaco/CodeMirror), if relevant:

## Additional context

Anything else that might be relevant (custom `validators`, `dialect`, `customFunctions`, etc.).
