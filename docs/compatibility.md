# Compatibility & Support

## Tested versions

| | Supported | Tested in this repo |
|---|---|---|
| Prometheus grammar | 2.x and 3.x | Function and keyword lists checked against Prometheus `main` (October 2026), including experimental functions |
| MetricsQL | Common extensions (see [MetricsQL](./metricsql.md)) | `packages/core/src/__tests__/metricsql.test.ts` |
| React | 18 and 19 | 18.3 in CI; 19.2 in a packed-tarball smoke test |
| Next.js | App Router and Pages Router (SSR) | 14.2 examples |
| Monaco Editor | `>= 0.40` | 0.50 |
| CodeMirror | 6.x | `@codemirror/view` 6.43, `state` 6.7, `language` 6.12, `autocomplete` 6.20, `lint` 6.9 |
| Node.js (core, CLI) | 18 or newer | CI on 20, 22 and 24 |
| Browsers | Last two versions of Chrome, Edge, Firefox and Safari | Playwright on Chromium, Firefox and WebKit |
| TypeScript | 5.x | 5.9 |

The packages ship ES2020 code as both ESM and CommonJS, with type declarations. Internet Explorer isn't supported.

## Versioning

- Each package follows [semantic versioning](https://semver.org/) for its API: props, exports and types.
- **Diagnostic codes** are part of the API. A code is never removed or given a new meaning outside a major release. Message text may change in any release.
- **Dictionary updates** (new Prometheus functions, new vocabulary) ship as minor or patch releases and are listed in [`CHANGELOG-GRAMMAR.md`](https://github.com/Ankitsharma991/promql-validator/blob/main/CHANGELOG-GRAMMAR.md).
- **Correctness fixes** (a valid query reported as invalid, or the other way round) are treated as high-priority bugs and ship as patch releases.
- Deprecated APIs keep working, with a development-only warning, for at least one minor release before removal in the next major.

## Support policy

- The latest minor release receives fixes.
- When a new major version ships, the previous major keeps getting security and correctness fixes for **12 months**.
- New stable Prometheus functions are added within 30 days of a Prometheus release. Until then, an unknown function is only a warning, so newer queries aren't blocked.

Report problems at <https://github.com/Ankitsharma991/promql-validator/issues> and security issues as described in [SECURITY.md](https://github.com/Ankitsharma991/promql-validator/blob/main/SECURITY.md).
