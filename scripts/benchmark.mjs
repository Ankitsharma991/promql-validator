#!/usr/bin/env node
// Real, measured performance benchmarks against the *built* @promql-validator/core package
// (not source) — run via `node scripts/benchmark.mjs` after `npm run build`. Numbers here
// are what actually gets reported in the project's README/PR notes; never invented.
//
// Modes:
//   node scripts/benchmark.mjs                          human-readable report (default)
//   node scripts/benchmark.mjs --json                    machine-readable results only
//   node scripts/benchmark.mjs --check [baseline.json]    compare against a committed
//                                                          baseline and exit 1 on regression
//   node scripts/benchmark.mjs --write-baseline [file]    (re)write the baseline from a fresh run
import { performance } from 'node:perf_hooks';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validatePromQL, getSuggestions } from '../packages/core/dist/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASELINE_PATH = join(__dirname, 'benchmark-baseline.json');

function time(fn, iterations) {
  for (let i = 0; i < Math.min(50, iterations); i++) fn(); // warm up (JIT)
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  return {
    p50: samples[Math.floor(samples.length * 0.5)],
    p95: samples[Math.floor(samples.length * 0.95)],
    p99: samples[Math.floor(samples.length * 0.99)],
    mean: sum / samples.length,
    max: samples[samples.length - 1],
  };
}

function fmt(stats) {
  return `p50=${stats.p50.toFixed(3)}ms p95=${stats.p95.toFixed(3)}ms p99=${stats.p99.toFixed(3)}ms mean=${stats.mean.toFixed(3)}ms max=${stats.max.toFixed(3)}ms`;
}

function makeValues(n) {
  return Array.from({ length: n }, (_, i) => `service-${i}-${Math.random().toString(36).slice(2, 8)}`);
}

function runAll() {
  const results = {};

  const smallQuery = 'up';
  results['validate:small'] = time(() => validatePromQL(smallQuery), 2000);

  const mediumQuery = 'sum by (service, namespace) (rate(http_requests_total{service="api",namespace="production"}[5m]))';
  results['validate:medium'] = time(() => validatePromQL(mediumQuery), 2000);

  const largeQuery = Array.from({ length: 8 }, (_, i) => `rate(http_requests_total{service="svc-${i}"}[5m])`).join(' + ');
  results['validate:large'] = time(() => validatePromQL(largeQuery), 1000);

  const pathological = '('.repeat(150) + '1' + ')'.repeat(150);
  results['validate:pathological'] = time(() => validatePromQL(pathological), 500);

  for (const n of [100, 1_000, 10_000, 100_000]) {
    const values = makeValues(n);
    const query = 'http_requests_total{service=';
    const cursor = query.length;
    const sources = { dynamicSuggestions: [{ category: 'service', values }] };
    results[`suggest:${n}:empty`] = time(() => getSuggestions(query, cursor, sources, { maxSuggestions: 50 }), n >= 10_000 ? 30 : 300);

    const prefixedQuery = query + 'service-1';
    results[`suggest:${n}:prefix`] = time(() => getSuggestions(prefixedQuery, prefixedQuery.length, sources, { maxSuggestions: 50 }), n >= 10_000 ? 30 : 300);
  }

  return results;
}

function printHuman(results) {
  console.log('=== Validation latency ===');
  console.log('small query ("up"):\n  ' + fmt(results['validate:small']));
  console.log('medium query:\n  ' + fmt(results['validate:medium']));
  console.log('large query (8 chained terms):\n  ' + fmt(results['validate:large']));
  console.log('pathological nesting (150 levels):\n  ' + fmt(results['validate:pathological']));

  console.log('\n=== Suggestion filter+rank latency (context: label-value) ===');
  for (const n of [100, 1_000, 10_000, 100_000]) {
    console.log(`${n.toLocaleString('en-US')} candidates, empty prefix:\n  ` + fmt(results[`suggest:${n}:empty`]));
    console.log(`${n.toLocaleString('en-US')} candidates, typed prefix:\n  ` + fmt(results[`suggest:${n}:prefix`]));
  }
}

function loadBaseline(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** A regression is flagged only when BOTH the relative slowdown is large AND the absolute
 * difference is non-trivial — sub-millisecond timings are inherently noisy (CI runner load
 * varies), so a purely relative threshold would flag noise as a "regression" constantly; a
 * purely absolute threshold would miss a real algorithmic regression on a fast benchmark.
 * The combination is what actually caught the real 600x indexing regression found during
 * development, while staying quiet on ordinary run-to-run jitter. */
const REGRESSION_RELATIVE_FACTOR = 5;
const REGRESSION_ABSOLUTE_MS = 1;

function checkRegressions(current, baseline) {
  const regressions = [];
  for (const key of Object.keys(baseline)) {
    const base = baseline[key]?.p50;
    const now = current[key]?.p50;
    if (typeof base !== 'number' || typeof now !== 'number' || base <= 0) continue;
    const factor = now / base;
    const absDelta = now - base;
    if (factor > REGRESSION_RELATIVE_FACTOR && absDelta > REGRESSION_ABSOLUTE_MS) {
      regressions.push({ key, baseline: base, current: now, factor });
    }
  }
  return regressions;
}

const args = process.argv.slice(2);
const results = runAll();

if (args.includes('--json')) {
  console.log(JSON.stringify(results, null, 2));
} else if (args.includes('--write-baseline')) {
  const idx = args.indexOf('--write-baseline');
  const path = args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : DEFAULT_BASELINE_PATH;
  writeFileSync(path, JSON.stringify(results, null, 2) + '\n');
  console.log(`Wrote baseline to ${path}`);
} else if (args.includes('--check')) {
  const idx = args.indexOf('--check');
  const path = args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : DEFAULT_BASELINE_PATH;
  const baseline = loadBaseline(path);
  if (!baseline) {
    console.error(`No baseline found at ${path} — run with --write-baseline first.`);
    process.exit(1);
  }
  printHuman(results);
  const regressions = checkRegressions(results, baseline);
  if (regressions.length > 0) {
    console.error('\n=== PERFORMANCE REGRESSION DETECTED ===');
    for (const r of regressions) {
      console.error(`  ${r.key}: baseline p50=${r.baseline.toFixed(3)}ms -> current p50=${r.current.toFixed(3)}ms (${r.factor.toFixed(1)}x slower)`);
    }
    process.exit(1);
  }
  console.log('\nNo regressions beyond threshold (>5x slower AND >1ms absolute) vs. baseline.');
} else {
  printHuman(results);

  console.log('\n=== One-time index build cost (fresh array reference, not memoized) ===');
  for (const n of [1_000, 10_000, 100_000]) {
    const buildTimes = [];
    for (let i = 0; i < 20; i++) {
      const values = makeValues(n);
      const start = performance.now();
      getSuggestions('http_requests_total{service=x', 30, { dynamicSuggestions: [{ category: 'service', values }] });
      buildTimes.push(performance.now() - start);
    }
    buildTimes.sort((a, b) => a - b);
    console.log(`${n.toLocaleString('en-US')} items, cold: p50=${buildTimes[Math.floor(buildTimes.length * 0.5)].toFixed(3)}ms max=${buildTimes[buildTimes.length - 1].toFixed(3)}ms`);
  }

  console.log('\n=== Memory (rough, single-process) ===');
  if (global.gc) global.gc();
  const before = process.memoryUsage().heapUsed;
  const bigSet = makeValues(100_000);
  const sources = { dynamicSuggestions: [{ category: 'service', values: bigSet }] };
  for (let i = 0; i < 200; i++) {
    getSuggestions(`http_requests_total{service=service-${i % 1000}`, 30, sources, { maxSuggestions: 50 });
  }
  if (global.gc) global.gc();
  const after = process.memoryUsage().heapUsed;
  console.log(`heapUsed before: ${(before / 1024 / 1024).toFixed(2)}MB, after 200 lookups against 100k candidates: ${(after / 1024 / 1024).toFixed(2)}MB (delta ${((after - before) / 1024 / 1024).toFixed(2)}MB)`);
  console.log('(run with `node --expose-gc scripts/benchmark.mjs` for a GC-forced, more reliable delta)');
}
