# Security Policy

## Supported versions

The latest minor release gets security fixes. After a new major release, the previous major keeps receiving security fixes for 12 months. See [docs/compatibility.md](./docs/compatibility.md).

## Reporting a vulnerability

Please report vulnerabilities privately, not in a public issue:

- GitHub: **Security → Report a vulnerability** on <https://github.com/Ankitsharma991/promql-validator/security/advisories/new>
- Email: **sharmaa7861@gmail.com** (subject starting with `[security] promql-validator`)

Include the affected package and version, a description, and the smallest input that reproduces it (a query string or a suggestion payload is usually enough).

You'll get a first response within **3 business days**. Confirmed issues are fixed in a patch release, and reporters are credited in the release notes unless they prefer to stay anonymous.

## Scope

The packages make **no network requests of their own** and store nothing outside in-memory state. Relevant issues include:

- Markup or script injection through suggestion content (all suggestion text is rendered as plain text, never as HTML).
- Denial of service through crafted query text: excessive recursion, super-linear matching (the parser has a nesting limit and a length guard; the fuzzy matcher is linear-time and regex-free).
- Unexpected network access or data persistence by any package.
- Supply-chain problems in the published packages.

[THREAT_MODEL.md](./THREAT_MODEL.md) describes the data flows, trust boundaries and mitigations in more detail.
