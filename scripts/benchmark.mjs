#!/usr/bin/env node
// Real, measured performance benchmarks against the *built* @promql-validator/core package
// (not source) — run via `node scripts/benchmark.mjs` after `npm run build`. Numbers here
// are what actually gets reported in the project's README/PR notes; never invented.
import { performance } from 'node:perf_hooks';
import { validatePromQL, getSuggestions } from '../packages/core/dist/index.mjs';

function time(fn, iterations) {
  // warm up (JIT)
  for (let i = 0; i < Math.min(50, iterations); i++) fn();
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

console.log('=== Validation latency ===');

const smallQuery = 'up';
console.log('small query (%s):', JSON.stringify(smallQuery));
console.log(' ', fmt(time(() => validatePromQL(smallQuery), 2000)));

const mediumQuery = 'sum by (service, namespace) (rate(http_requests_total{service="api",namespace="production"}[5m]))';
console.log('medium query (%d chars):', mediumQuery.length);
console.log(' ', fmt(time(() => validatePromQL(mediumQuery), 2000)));

const largeQuery = Array.from({ length: 8 }, (_, i) => `rate(http_requests_total{service="svc-${i}"}[5m])`).join(' + ');
console.log('large query (%d chars):', largeQuery.length);
console.log(' ', fmt(time(() => validatePromQL(largeQuery), 1000)));

const pathological = '('.repeat(150) + '1' + ')'.repeat(150);
console.log('pathological nesting (%d chars):', pathological.length);
console.log(' ', fmt(time(() => validatePromQL(pathological), 500)));

console.log('\n=== Suggestion filter+rank latency (context: label-value) ===');

function makeValues(n) {
  return Array.from({ length: n }, (_, i) => `service-${i}-${Math.random().toString(36).slice(2, 8)}`);
}

for (const n of [100, 1_000, 10_000, 100_000]) {
  const values = makeValues(n);
  const query = 'http_requests_total{service=';
  const cursor = query.length;
  const sources = { dynamicSuggestions: [{ category: 'service', values }] };
  console.log(`${n.toLocaleString()} candidates, empty prefix:`);
  console.log(' ', fmt(time(() => getSuggestions(query, cursor, sources, { maxSuggestions: 50 }), n >= 10_000 ? 30 : 300)));

  const prefixedQuery = query + 'service-1';
  console.log(`${n.toLocaleString()} candidates, typed prefix "service-1":`);
  console.log(' ', fmt(time(() => getSuggestions(prefixedQuery, prefixedQuery.length, sources, { maxSuggestions: 50 }), n >= 10_000 ? 30 : 300)));
}

console.log('\n=== One-time index build cost (fresh array reference, not memoized) ===');
for (const n of [1_000, 10_000, 100_000]) {
  const buildTimes = [];
  for (let i = 0; i < 20; i++) {
    const values = makeValues(n); // fresh array each iteration -> cache miss every time
    const start = performance.now();
    getSuggestions('http_requests_total{service=x', 30, { dynamicSuggestions: [{ category: 'service', values }] });
    buildTimes.push(performance.now() - start);
  }
  buildTimes.sort((a, b) => a - b);
  console.log(`${n.toLocaleString()} items, cold (index built fresh each time): p50=${buildTimes[Math.floor(buildTimes.length * 0.5)].toFixed(3)}ms max=${buildTimes[buildTimes.length - 1].toFixed(3)}ms`);
}

console.log('\n=== Memory (rough, single-process, GC not forced) ===');
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
