---
layout: home

hero:
  name: promql-validator
  text: PromQL editing, done right.
  tagline: Validation, context-aware autocomplete, and a themeable React editor component for PromQL and MetricsQL — zero telemetry, real accessibility, sub-millisecond suggestions.
  actions:
    - theme: brand
      text: Get Started
      link: /installation
    - theme: alt
      text: Quick Start
      link: /quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/promql-validator/promql-validator

features:
  - icon: ✅
    title: Real validation, not regex
    details: A hand-written lexer and recursive-descent parser produce precise, stable diagnostic codes for syntax and semantic errors — including graceful recovery for queries that are still mid-typing.
  - icon: ⚡
    title: Fast at scale
    details: Suggestion filtering and ranking use a binary-search index over large label-value sets, memoized per array reference — sub-millisecond p50 latency even against 100,000 candidates.
  - icon: 🧩
    title: Framework adapters
    details: A first-class React component, plus Monaco and CodeMirror 6 language adapters — all built on the same validation and suggestion engine, so behavior stays consistent everywhere.
  - icon: ♿
    title: Accessible by default
    details: The editor component is built on a native <input> with correct combobox ARIA semantics, verified with jest-axe and real screen-reader-relevant relationships — not retrofitted.
  - icon: 🔌
    title: Pluggable
    details: A plugin registry lets you contribute custom suggestion providers and diagnostics without forking, combined safely with Promise.allSettled so one failing plugin can't break the rest.
  - icon: 📦
    title: Small, honest bundles
    details: Optional peer dependencies (virtualization, Monaco, CodeMirror) are real dynamic imports with zero cost when unused — verified in CI against committed size budgets, not just claimed.
---
