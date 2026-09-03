# Security Policy

## Reporting a vulnerability

Please report suspected security vulnerabilities privately via GitHub's "Report a vulnerability" flow on this repository (Security tab → Advisories → New draft security advisory), rather than filing a public issue. We aim to acknowledge reports within a few business days.

## Scope

`promql-validator` (`@promql-validator/core`, `@promql-validator/react`, `promql-validator`) makes **no network requests on its own** and stores no data outside in-memory component state (see the README's Privacy section). Relevant vulnerability classes for this project:

- XSS via unsanitized rendering of suggestion content (the package renders all suggestion text as plain text, never `dangerouslySetInnerHTML`).
- ReDoS or unbounded-recursion denial-of-service via crafted query text (the parser enforces a max nesting depth and the fuzzy matcher is a bounded, non-regex algorithm — see `packages/core/src/suggestions/fuzzy.ts` and `MAX_NESTING_DEPTH` in `packages/core/src/parser/parser.ts`).
- Dependency supply-chain issues in the (intentionally minimal) dependency tree.

## Disclosure

We'll credit reporters (unless anonymity is requested) in the release notes once a fix ships.
