# Versioning & Migration

## Policy

- Package semver governs **API** compatibility (props, exported functions/types) for each of `@promql-validator/core`, `@promql-validator/react`, and `promql-validator`, versioned independently.
- Grammar-dictionary updates (a new Prometheus function added to the built-ins) are **not** breaking changes by default — shipped as minor/patch, tracked in [`CHANGELOG-GRAMMAR.md`](https://github.com/promql-validator/promql-validator/blob/main/CHANGELOG-GRAMMAR.md), separate from the package's own `CHANGELOG.md`, since a dictionary update is a data change, not an API change.
- A `Diagnostic.code` is never removed or repurposed without a major version bump — code is expected to branch on it.
- Deprecated props/exports keep working with a dev-mode-only `console.warn` (stripped from production builds) for at least one minor version before removal in the next major.

## Releases

Managed via [Changesets](https://github.com/changesets/changesets) — each PR that changes published behavior includes a changeset file describing the bump (patch/minor/major) and a one-line summary; merging to `main` triggers a version-bump PR, and merging *that* publishes to npm with provenance.
