# Installation

## The editor component (React)

```bash
npm install promql-validator
```

Peer dependencies: `react >= 18`, `react-dom >= 18`. Import the stylesheet once, wherever you set up global styles:

```ts
import 'promql-validator/styles.css';
```

## Validation / formatting only (no React)

If you only need `validatePromQL`/`formatPromQL`/`getSuggestions` — e.g. for CI linting of saved recording rules, or a server-side validation endpoint — skip React entirely:

```bash
npm install @promql-validator/core
```

`@promql-validator/core` has zero runtime dependencies and never touches the DOM. It works in Node ≥ 18, the browser, and Deno.

## Package layout

| Package | Contains | Peer dependencies |
|---|---|---|
| `promql-validator` | The React editor, everything from core, and the CLI | `react`, `react-dom` |
| `@promql-validator/react` | `<PromQLInput/>` and the shared provider | `react`, `react-dom` (`@tanstack/react-virtual` optional) |
| `@promql-validator/core` | Parser, validator, formatter, suggestion engine | none |
| `@promql-validator/monaco` | Monaco Editor language support | `monaco-editor` |
| `@promql-validator/codemirror` | CodeMirror 6 language support | `@codemirror/*` |

## Monaco or CodeMirror

```bash
npm install @promql-validator/monaco monaco-editor
npm install @promql-validator/codemirror @codemirror/state @codemirror/view @codemirror/language @codemirror/autocomplete @codemirror/lint
```

See [Monaco](./monaco.md) and [CodeMirror](./codemirror.md).

## TypeScript

Every package ships its own type declarations, so no `@types/*` package is needed. The public API is fully typed and works with `strict` mode.

## Module formats

ESM (`import`) and CommonJS (`require`) builds are published through an `exports` map. Bundlers (Vite, webpack, Next.js, Rollup) pick the ESM build; a plain Node `require()` gets CommonJS.

## Next.js

The component is SSR-safe. In the App Router, render it from a client component (`'use client'`). See `examples/nextjs-app-router` and `examples/nextjs-pages-router`.

## Environment variables

None. The package needs no configuration or credentials to build, test, or run — see [Security & Privacy](./security-privacy.md).
