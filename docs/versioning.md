# Versioning & Releases

The versioning rules, the support window and the tested versions are on [Compatibility & support](./compatibility.md).

## How releases are made

Releases are published from a maintainer's machine with `npx changeset publish` (it only publishes versions that aren't on npm yet). The *Release* workflow in GitHub Actions does the same from CI with provenance and SBOMs, but only when started by hand, and only once an `NPM_TOKEN` secret is configured.

Releases use [Changesets](https://github.com/changesets/changesets):

1. A pull request that changes published behaviour adds a changeset (`npm run changeset`) describing the bump (patch, minor or major) and a one-line summary.
2. When it's merged to `main`, the release workflow opens a "Version Packages" pull request that bumps versions and updates each package's `CHANGELOG.md`.
3. Merging that pull request publishes to npm with provenance and attaches a CycloneDX SBOM per package to the workflow run.

Dictionary and grammar coverage changes are also listed in [`CHANGELOG-GRAMMAR.md`](https://github.com/Ankitsharma991/promql-validator/blob/main/CHANGELOG-GRAMMAR.md).
