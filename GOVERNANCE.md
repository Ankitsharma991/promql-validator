# Governance

## Maintainer

promql-validator is created and maintained by **Ankit Sharma** ([@ankitsharma991](https://github.com/Ankitsharma991), [sharmaa7861@gmail.com](mailto:sharmaa7861@gmail.com)), who reviews and merges pull requests, triages issues and publishes releases.

## Decisions

- Day-to-day changes go through pull requests and need a passing CI run and the maintainer's review.
- Larger changes (new packages, new public APIs, breaking changes, new runtime dependencies) start as a GitHub issue so the design can be discussed before code is written.
- Correctness bugs (a valid query rejected, or an invalid one accepted) take priority over new features.

## Releases

Releases are cut from `main` through Changesets and published by CI with npm provenance. See [docs/versioning.md](./docs/versioning.md) and [docs/compatibility.md](./docs/compatibility.md).

## Becoming a maintainer

Regular contributors who have shown good judgement in reviews and changes may be invited to become maintainers with merge rights. If your company depends on the project and would like to help maintain or sponsor it, get in touch by email.
