---
name: Grammar / function-dictionary gap
about: A valid PromQL or MetricsQL construct isn't recognized, or a built-in function/dictionary entry is missing or wrong
title: ''
labels: grammar-gap
assignees: ''
---

This is a distinct template from a general bug report because dictionary/grammar-coverage
gaps are usually **data changes** (tracked in `CHANGELOG-GRAMMAR.md`), not code bugs.

## The construct

```
paste the query, function name, or syntax that isn't handled correctly
```

## Dialect

- [ ] Prometheus PromQL (`dialect: 'promql'`, the default)
- [ ] MetricsQL (`dialect: 'metricsql'`) — note: MetricsQL support is an explicitly
      best-effort subset (see `CHANGELOG-GRAMMAR.md`), so gaps here are especially expected
      and welcome to report.

## What's wrong

- [ ] A valid function/construct is flagged as unknown/invalid
- [ ] A function's arity/argument-type check is wrong
- [ ] A function is missing from autocomplete but otherwise valid
- [ ] Something else (describe below)

## Reference

A link to the authoritative Prometheus or VictoriaMetrics documentation for this construct, if you have one — speeds up verification significantly.
