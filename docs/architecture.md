# Architecture

```
promql-validator               React editor + core + CLI (re-exports @promql-validator/react)
@promql-validator/core         lexer, parser, validator, formatter, suggestion engine   (no dependencies, no DOM)
@promql-validator/react        <PromQLInput/>, suggestion popup, diagnostics, theming   (peer: react)
@promql-validator/monaco       Monaco language: highlighting, completion, markers       (peer: monaco-editor)
@promql-validator/codemirror   CodeMirror 6 language, completion, lint                  (peer: @codemirror/*)
```

Every editor surface calls the same core functions (`validatePromQL`, `getSuggestions`, `extractContext`, `tokenize`), so there is exactly one grammar and one ranking implementation. The adapters only translate between core types and their editor's APIs, and a test checks that each one produces the same suggestions and diagnostics as core.

`@promql-validator/core` is kept external in every adapter's bundle rather than inlined, so an app that uses two surfaces ships one copy of it.

## Why a hand-written parser

- Regex "validators" can't handle nesting, string escapes or arity, and they give false results on valid but unusual queries.
- A parser generator adds a runtime dependency and generated code for a grammar that is small and well known.
- A WASM build of Prometheus' Go parser is hundreds of kilobytes and has no hooks for error recovery.

The lexer (`packages/core/src/lexer/tokenizer.ts`) and the recursive-descent / precedence-climbing parser (`packages/core/src/parser/parser.ts`) together are about 1,300 lines. They return a partial AST for half-typed input, which is what makes in-editor autocomplete and quiet validation possible.

## Error-tolerant parsing

Whenever the parser needs input it doesn't have, it decides which of two cases it's in:

- **Incomplete**: the input simply ran out (`rate(`, `up{job="`), or a slot that auto-closed brackets leave behind is still empty (`rate()`, `x[]`). It inserts a placeholder node, sets `incomplete: true` and reports nothing.
- **Invalid**: there's a wrong token, a mismatched bracket or an impossible construct. It reports an `error`.

After the first syntax error, every later error is almost always a consequence of it, so only the first is reported. Semantic checks (`validator/semantic.ts`) run only on a syntactically clean AST.

## Suggestion pipeline

```
query + cursor
  → extractContext()     where is the cursor? label-name, label-value, function-arg, duration, …
  → collect candidates   built-ins (indexed once per page) + static + dynamic (indexed above 500 items) + async results
  → filter by context    e.g. never a function inside a label value
  → rank                 exact > prefix > fuzzy (bounded) > context boost > priority > source
  → dedupe and cap       by (value, category); maxSuggestions
```

Async providers run through `AsyncSuggestionController` (debounce, `AbortController`, request sequencing to drop stale responses, in-memory LRU cache, output sanitising). The React component, both adapters and your own code can use it.

## The React editor

- A native `<input role="combobox">` holds the text, the caret, selection, IME and undo.
- A highlight layer (`QueryHighlight`) sits exactly on top with `pointer-events: none` and `aria-hidden`. It draws the tokens and underlines with CSS `attr()` content, so the query text exists in the DOM only once.
- `useDebouncedValidation` and `useSuggestions` own the timing. Diagnostics are only drawn once validation has caught up with the current text, so underlines never land on the wrong characters.

## Repository layout

```
packages/
  core/         @promql-validator/core
    conformance/promql.json   accept/reject corpus checked against Prometheus
  react/        @promql-validator/react
  meta/         promql-validator (+ CLI)
  monaco/       @promql-validator/monaco
  codemirror/   @promql-validator/codemirror
examples/       Vite + React, Next.js App Router, Next.js Pages Router
e2e/            Playwright tests against the Vite example
docs/           this documentation (VitePress)
scripts/        benchmark.mjs and its committed baseline
```
