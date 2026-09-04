# Architecture

```
promql-validator            (meta package — re-exports @promql-validator/react)
@promql-validator/core      (parser, validator, formatter, suggestion engine — zero deps, no DOM/React)
@promql-validator/react     (<PromQLInput/>, popup, theming, keyboard/a11y — React peer dep)
```

`@promql-validator/react` depends on `@promql-validator/core` (kept external in the published bundle, never inlined — verified by inspecting the built output) — never the other way around. Core is usable standalone in Node, the browser, or (architecturally) inside a future Monaco/CodeMirror adapter, since it never assumes a React event model.

## Why a hand-written parser, not regex or a parser-generator

Regex-based "validators" can't correctly handle nested brackets, string escaping, or arity checks, and produce false positives/negatives on valid-but-unusual queries. A generic parser-generator (PEG.js, chevrotain) adds a runtime dependency and generated-code bundle weight for a grammar that's a well-known, bounded EBNF. A WASM port of Prometheus's own Go parser adds hundreds of KB and gives no first-class error-recovery hooks. The hand-written recursive-descent / precedence-climbing parser (`packages/core/src/parser/parser.ts`, ~700 lines) returns **partial ASTs with recovery nodes** for exactly the mid-typing states a real editor needs (`rate(`, `metric{`, `metric{label=`) and keeps the core bundle at ~18.5KB min+gzip.

## Error-tolerant parsing (the product-critical bit)

The parser distinguishes two failure modes at every point it needs more input than is available:

- **Structurally incomplete-and-expected** (ran out of input, not a wrong token): synthesizes a placeholder node, sets `incomplete: true`, emits **no error diagnostic** for the gap itself.
- **Genuinely invalid** (wrong token, wrong bracket type, mismatched grammar): a real `error` diagnostic.

This is what lets autocomplete stay useful *while the user is still typing* rather than only working on syntactically-complete queries — see `ContextExtractor` (`packages/core/src/suggestions/context-extractor.ts`), which classifies the cursor's grammatical position via a lightweight bracket-stack walk over the token stream (robust to malformed input by construction, since it never requires a fully-valid AST).

## Suggestion pipeline

```
query + cursor
  → extractContext()          — classify astContext (label-name, label-value, function-arg, ...)
  → collect candidates          — built-ins (module-level, indexed once) + static + dynamic (indexed if >500 items) + async (already-resolved)
  → context-filter               — e.g. never suggest functions inside a label-value position
  → rank                         — exact > prefix > fuzzy(bounded) > context-relevance > priority > source-specificity
  → dedupe by (value, category)
  → cap at maxSuggestions
```

Async provider orchestration (debounce, `AbortController`, request-sequence staleness guard, opt-in LRU cache) lives in `AsyncSuggestionController` — framework-agnostic; the React `useSuggestions` hook only owns re-render wiring around it.

## Repository layout

```
packages/
  core/    @promql-validator/core
  react/   @promql-validator/react
  meta/    promql-validator
examples/
docs/
scripts/benchmark.mjs
```
