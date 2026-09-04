# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs across the `@promql-validator/core`, `@promql-validator/react`, and `promql-validator` packages independently.

## Adding a changeset

After making a change that should ship in the next release:

```bash
npx changeset
```

Follow the prompts: pick which package(s) changed, the bump type (patch/minor/major), and write a one-line summary — this becomes the changelog entry.

**Note:** grammar-dictionary changes (new PromQL functions added to the built-in list) should *also* get an entry in `CHANGELOG-GRAMMAR.md` at the repo root, tracked separately from the package's own semver.

## Releasing

```bash
npx changeset version   # consumes pending changesets, bumps versions, updates CHANGELOGs
npx changeset publish   # publishes each changed package to npm
```

In CI, this is automated: merging changesets to `main` opens a "Version Packages" PR; merging that PR publishes.
