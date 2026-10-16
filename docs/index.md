---
layout: home

hero:
  name: promql-validator
  text: PromQL editing, done right.
  tagline: A PromQL editor and validator for React, Monaco and CodeMirror. Highlighting, validation that matches Prometheus, quick fixes and context-aware autocomplete.
  actions:
    - theme: brand
      text: Get Started
      link: /installation
    - theme: alt
      text: Quick Start
      link: /quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/Ankitsharma991/promql-validator

features:
  - icon: ✅
    title: Validation that matches Prometheus
    details: A hand-written parser covering all of PromQL, including Prometheus 3 UTF-8 names and duration expressions, checked against a conformance corpus. Half-typed queries stay quiet; real mistakes get one clear error and often a one-click fix.
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
    title: Knows your stack
    details: Built-in names from Prometheus, Kubernetes, OpenTelemetry, traces and logs, plus your own label values, metric catalogs and async backends. Plugins bundle a team's rules and vocabulary.
  - icon: 📦
    title: Small, honest bundles
    details: Code you don't use isn't loaded. The virtualized list is a lazy chunk, Monaco and CodeMirror support live in separate packages, and every package has a size budget enforced in CI.
---
