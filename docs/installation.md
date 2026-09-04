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

| Package | Contains | Pulls in React? |
|---|---|---|
| `promql-validator` | Everything (convenience re-export of `@promql-validator/react`) | Yes (peer dep) |
| `@promql-validator/react` | `<PromQLInput/>` and friends | Yes (peer dep) |
| `@promql-validator/core` | Parser, validator, formatter, suggestion engine | No |

## TypeScript

Both packages ship their own `.d.ts` — no `@types/*` package needed. `strict` mode is fully supported; the public API avoids `any`.

## Module formats

Both ESM (`import`) and CJS (`require`) are published via an `exports` map. Bundlers (Vite, webpack, Next.js, Rollup) resolve ESM automatically; a plain Node `require()` script gets the CJS build.

## Environment variables

None. The package needs no configuration or credentials to build, test, or run — see [Security & Privacy](./security-privacy.md).
