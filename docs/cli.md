# CLI

The `promql-validator` package installs a `promql-validator` command for checking queries in CI.

```bash
npx promql-validator lint <file> [--rules] [--format text|json]
```

| Option | |
|---|---|
| `<file>` | A file with one query per line (blank lines and lines starting with `#` are skipped), or `-` for stdin |
| `--rules` | Treat the file as a Prometheus recording/alerting rule file and check every `expr:` |
| `--format json` | Machine-readable output |
| `-h`, `--help` | Usage |

The exit code is `1` if any query is invalid and `0` otherwise.

## Examples

```bash
# a list of queries
npx promql-validator lint dashboards/queries.txt

# every rule in a rules file
npx promql-validator lint prometheus/rules.yml --rules

# from another tool, as JSON
jq -r '.panels[].targets[].expr' dashboard.json | npx promql-validator lint - --format json
```

## In GitHub Actions

```yaml
- run: npx --yes promql-validator lint prometheus/rules.yml --rules
```

## Rule-file support

The rule-file reader is purpose-built for the shape Prometheus uses (`groups:` → `rules:` → `record:`/`alert:` + `expr:`), including block scalars (`expr: |`). It doesn't handle YAML anchors or flow-style mappings. For those, parse the YAML yourself and pass each `expr` to `validatePromQL`.
