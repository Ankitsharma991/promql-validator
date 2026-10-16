# Roadmap

What's planned but not built yet. Everything else described in these docs ships today.

## Grammar

- Prometheus' newest experimental syntax: `fill()` / `fill_left()` / `fill_right()` binary-operator modifiers, `anchored` and `smoothed` range modifiers, and the `</` and `>/` trim operators. Queries using them are currently reported as syntax errors.
- MetricsQL: parameterized `WITH` templates (`f(x) = …`) and a larger share of the ~100 extension functions.
- A custom-dialect API, so an organisation can describe its own PromQL fork (extra functions, operators, duration units) without code changes. Today `customFunctions`, `disabledFunctions` and plugins cover the most common case.

## Scale

- A worker-backed suggestion engine for candidate sets in the millions, with automatic main-thread/worker switching and one shared worker per page. Validation can already run in a worker (`useWorker`), and suggestions stay well under a millisecond up to 100,000 indexed candidates.
- Paged async providers (`hasMore` / `nextCursor`) that fetch more results as the user scrolls.
- Incremental re-lexing for very long (multi-thousand-character) queries.
- Virtualized suggestion list as the default. It's available today with `suggestionListMode="virtualized"`.

## Verification

- A scheduled CI job that runs the conformance corpus through a pinned `promtool` binary and reports any disagreement.
- A larger, real-world query corpus taken from public dashboards and rule files.
- Property-based fuzzing of the formatter (formatting never changes the parsed AST).

## Packaging

- A separate `@promql-validator/plugin-sdk` package for teams that build plugins in isolation. `definePlugin` and `validatePluginConfiguration` are already exported from core.
- Community locale packs (`@promql-validator/locale-*`) built on the `messages` catalog.

Have a use case that needs one of these sooner? Open an issue at <https://github.com/Ankitsharma991/promql-validator/issues>.
