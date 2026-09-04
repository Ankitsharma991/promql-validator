import { Suggestion, SuggestionInput, normalizeSuggestion } from './types.js';

interface IndexedEntry {
  lower: string;
  suggestion: Suggestion;
}

interface IndexedSource {
  /** Sorted ascending by lowercased value — enables O(log n) prefix lookup via binary search. */
  sortedByValue: IndexedEntry[];
}

/**
 * Per-source-array index cache, keyed by array *reference* (Part 90: "avoid rebuilding
 * expensive indexes on every render... use reference-aware invalidation"). A `WeakMap` means
 * an index is garbage-collected automatically once the host stops passing that array
 * reference — no manual cache-eviction bookkeeping, no leak.
 */
const indexCache = new WeakMap<SuggestionInput[], IndexedSource>();

/** Arrays at or below this size go through the plain full-scan path — indexing has fixed
 * overhead (building + maintaining a sorted structure) that isn't worth paying for a small,
 * typical host-supplied list. */
export const LARGE_SOURCE_THRESHOLD = 500;

/** Even once indexed, never hand more than this many items downstream — ranking/fuzzy
 * matching only ever surfaces `maxSuggestions` (default 50) anyway, so a generous-but-bounded
 * candidate set is all indexing needs to produce. */
export const INDEX_RESULT_CAP = 300;

function buildIndex(values: SuggestionInput[], fallbackCategory: string): IndexedSource {
  const entries: IndexedEntry[] = values.map((v) => {
    const suggestion = normalizeSuggestion(v, fallbackCategory);
    return { lower: suggestion.value.toLowerCase(), suggestion };
  });
  entries.sort((a, b) => (a.lower < b.lower ? -1 : a.lower > b.lower ? 1 : 0));
  return { sortedByValue: entries };
}

function getOrBuildIndex(values: SuggestionInput[], fallbackCategory: string): IndexedSource {
  const cached = indexCache.get(values);
  if (cached) return cached;
  const built = buildIndex(values, fallbackCategory);
  indexCache.set(values, built);
  return built;
}

/** Binary search for the first entry whose lowercased value is >= `prefix`. */
function lowerBound(entries: IndexedEntry[], prefix: string): number {
  let lo = 0;
  let hi = entries.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (entries[mid]!.lower < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Returns up to `cap` suggestions from a large source array, using the memoized sorted
 * index so a keystroke over a 10k-100k-item host array stays fast (O(log n) to locate the
 * prefix range, O(matches) to walk it) instead of the O(n) full-array scan the plain path
 * uses for small/medium arrays.
 */
export function indexedLookup(values: SuggestionInput[], fallbackCategory: string, prefixLower: string, cap: number = INDEX_RESULT_CAP): Suggestion[] {
  const index = getOrBuildIndex(values, fallbackCategory);
  const arr = index.sortedByValue;
  if (!prefixLower) {
    // No prefix typed yet: the array is already sorted, so the first `cap` entries are a
    // deterministic, well-defined subset — no need to touch the other n-cap items at all.
    const out: Suggestion[] = new Array(Math.min(cap, arr.length));
    for (let i = 0; i < out.length; i++) out[i] = arr[i]!.suggestion;
    return out;
  }
  const start = lowerBound(arr, prefixLower);
  const out: Suggestion[] = [];
  for (let i = start; i < arr.length && out.length < cap; i++) {
    if (!arr[i]!.lower.startsWith(prefixLower)) break;
    out.push(arr[i]!.suggestion);
  }
  return out;
}
