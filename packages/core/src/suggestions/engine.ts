import { PROMQL_FUNCTIONS } from './builtins/functions.js';
import { PROMQL_AGGREGATIONS } from './builtins/aggregations.js';
import { COMMON_DURATIONS, PROMQL_OPERATORS } from './builtins/operators.js';
import { BUILTIN_LABEL_NAMES, BUILTIN_MONITORING_TERMS } from './builtins/monitoring.js';
import { extractContext } from './context-extractor.js';
import { fuzzyScore } from './fuzzy.js';
import { LARGE_SOURCE_THRESHOLD, indexedLookup } from './indexing.js';
import {
  AstContext,
  DynamicSuggestionGroup,
  Suggestion,
  SuggestionCategoryConfig,
  SuggestionContext,
  SuggestionContextMatcher,
  SuggestionInput,
  normalizeSuggestion,
} from './types.js';

export interface SuggestionSources {
  suggestions?: SuggestionInput[];
  dynamicSuggestions?: DynamicSuggestionGroup[];
  /** Extra results already fetched from an async provider (merged in at full priority). */
  providedSuggestions?: Suggestion[];
  suggestionCategories?: SuggestionCategoryConfig;
  includeBuiltins?: boolean;
  recentlyUsedValues?: string[];
}

export interface GetSuggestionsOptions {
  maxSuggestions?: number;
  fuzzyMatchThreshold?: number;
}

const DEFAULT_MAX_SUGGESTIONS = 50;
const DEFAULT_FUZZY_THRESHOLD = 500;

// Precomputed once at module load — immutable, shared across every component instance.
const BUILTIN_FUNCTION_SUGGESTIONS: Suggestion[] = PROMQL_FUNCTIONS.map((f) => ({
  label: f.name,
  value: f.name,
  category: 'promql-function',
  detail: f.detail,
  description: f.description,
  insertText: f.insertText,
}));

const BUILTIN_AGGREGATION_SUGGESTIONS: Suggestion[] = PROMQL_AGGREGATIONS.map((a) => ({
  label: a.name,
  value: a.name,
  category: 'aggregation',
  detail: a.detail,
  description: a.description,
}));

const BUILTIN_OPERATOR_SUGGESTIONS: Suggestion[] = PROMQL_OPERATORS.filter((o) => o.category !== 'modifier').map((o) => ({
  label: o.name,
  value: o.name,
  category: 'operator',
  detail: o.detail,
  description: o.description,
}));

const BUILTIN_MODIFIER_SUGGESTIONS: Suggestion[] = PROMQL_OPERATORS.filter((o) => o.category === 'modifier').map((o) => ({
  label: o.name,
  value: o.name,
  category: 'modifier',
  detail: o.detail,
  description: o.description,
}));

const BUILTIN_DURATION_SUGGESTIONS: Suggestion[] = COMMON_DURATIONS.map((d) => ({ label: d, value: d, category: 'duration' }));

const BUILTIN_LABEL_NAME_SUGGESTIONS: Suggestion[] = BUILTIN_LABEL_NAMES.map((l) => ({ label: l.name, value: l.name, category: 'label-name', description: l.description }));

const BUILTIN_MONITORING_TERM_SUGGESTIONS: Suggestion[] = BUILTIN_MONITORING_TERMS.map((t) => ({ label: t.name, value: t.name, category: 'monitoring-term', description: t.description }));

const CONTEXT_ELIGIBLE_BUILTIN_CATEGORIES: Record<AstContext, string[]> = {
  'top-level': ['promql-function', 'aggregation', 'monitoring-term'],
  'function-arg': ['promql-function', 'aggregation', 'monitoring-term'],
  'label-name': ['label-name'],
  'label-value': [],
  duration: ['duration'],
  operator: ['operator', 'modifier'],
  'aggregation-grouping': ['label-name'],
  unknown: [],
};

function matchesContextMatcher(matcher: SuggestionContextMatcher, ctx: SuggestionContext): boolean {
  if (matcher.astContext) {
    const list = Array.isArray(matcher.astContext) ? matcher.astContext : [matcher.astContext];
    if (!list.includes(ctx.astContext)) return false;
  }
  if (matcher.activeLabel) {
    const list = Array.isArray(matcher.activeLabel) ? matcher.activeLabel : [matcher.activeLabel];
    if (!ctx.activeLabel || !list.includes(ctx.activeLabel)) return false;
  }
  return true;
}

/** Default eligibility for host-supplied suggestions that didn't declare explicit `contexts`. */
function defaultHostEligible(astContext: AstContext): boolean {
  return astContext === 'top-level' || astContext === 'function-arg' || astContext === 'label-value';
}

interface Candidate {
  suggestion: Suggestion;
  sourceWeight: number;
  contextBoost: number;
}

function collectBuiltins(ctx: SuggestionContext, categoryConfig: SuggestionCategoryConfig | undefined): Candidate[] {
  const eligibleCategories = new Set(CONTEXT_ELIGIBLE_BUILTIN_CATEGORIES[ctx.astContext]);
  const all = [
    ...BUILTIN_FUNCTION_SUGGESTIONS,
    ...BUILTIN_AGGREGATION_SUGGESTIONS,
    ...BUILTIN_OPERATOR_SUGGESTIONS,
    ...BUILTIN_MODIFIER_SUGGESTIONS,
    ...BUILTIN_DURATION_SUGGESTIONS,
    ...BUILTIN_LABEL_NAME_SUGGESTIONS,
    ...BUILTIN_MONITORING_TERM_SUGGESTIONS,
  ];
  const out: Candidate[] = [];
  for (const s of all) {
    const category = s.category ?? 'custom';
    if (!eligibleCategories.has(category)) continue;
    const conf = categoryConfig?.[category];
    if (conf?.enabled === false) continue;
    const label = conf?.labelOverrides?.[s.value] ?? s.label;
    out.push({
      suggestion: label === s.label ? s : { ...s, label },
      sourceWeight: 100 + (conf?.priorityWeight ?? 0),
      contextBoost: 0,
    });
  }
  return out;
}

function collectStatic(sources: SuggestionSources, ctx: SuggestionContext, categoryConfig: SuggestionCategoryConfig | undefined): Candidate[] {
  const values = sources.suggestions;
  if (!values || values.length === 0) return [];
  if (!defaultHostEligible(ctx.astContext)) return [];

  const out: Candidate[] = [];
  const needle = ctx.tokenBeforeCursor.toLowerCase();

  // Large host-supplied arrays go through the memoized sorted-prefix index (Part 27.2/90)
  // instead of a full O(n) scan on every keystroke — see indexing.ts for the rationale.
  if (values.length > LARGE_SOURCE_THRESHOLD) {
    for (const s of indexedLookup(values, 'custom', needle)) {
      const conf = categoryConfig?.[s.category ?? 'custom'];
      if (conf?.enabled === false) continue;
      out.push({ suggestion: s, sourceWeight: 300 + (conf?.priorityWeight ?? 0), contextBoost: 0 });
    }
    return out;
  }

  for (const raw of values) {
    const s = normalizeSuggestion(raw);
    const conf = categoryConfig?.[s.category ?? 'custom'];
    if (conf?.enabled === false) continue;
    out.push({ suggestion: s, sourceWeight: 300 + (conf?.priorityWeight ?? 0), contextBoost: 0 });
  }
  return out;
}

function collectDynamic(sources: SuggestionSources, ctx: SuggestionContext, categoryConfig: SuggestionCategoryConfig | undefined): Candidate[] {
  const out: Candidate[] = [];
  const needle = ctx.tokenBeforeCursor.toLowerCase();

  for (const group of sources.dynamicSuggestions ?? []) {
    const conf = categoryConfig?.[group.category];
    if (conf?.enabled === false) continue;

    let eligible: boolean;
    if (group.contexts && group.contexts.length > 0) {
      eligible = group.contexts.some((m) => matchesContextMatcher(m, ctx));
    } else {
      eligible = defaultHostEligible(ctx.astContext);
    }
    if (!eligible) continue;

    const strongMatch = ctx.astContext === 'label-value' && ctx.activeLabel === group.category;

    if (group.values.length > LARGE_SOURCE_THRESHOLD) {
      for (const s of indexedLookup(group.values, group.category, needle)) {
        out.push({
          suggestion: s.category ? s : { ...s, category: group.category },
          sourceWeight: 400 + (conf?.priorityWeight ?? 0),
          contextBoost: strongMatch ? 300 : 0,
        });
      }
      continue;
    }

    for (const raw of group.values) {
      const s = normalizeSuggestion(raw, group.category);
      out.push({
        suggestion: s.category ? s : { ...s, category: group.category },
        sourceWeight: 400 + (conf?.priorityWeight ?? 0),
        contextBoost: strongMatch ? 300 : 0,
      });
    }
  }
  for (const s of sources.providedSuggestions ?? []) {
    out.push({ suggestion: s, sourceWeight: 400, contextBoost: ctx.astContext === 'label-value' && ctx.activeLabel === s.category ? 300 : 0 });
  }
  return out;
}

/**
 * Synchronous merge/rank/filter pipeline over built-in + static + dynamic (already-fetched
 * async) suggestion sources. Framework-agnostic — the React layer's async provider wiring
 * (debounce, cancellation, caching) calls this once it has resolved `providedSuggestions`.
 */
export function getSuggestions(query: string, cursorPosition: number, sources: SuggestionSources = {}, options: GetSuggestionsOptions = {}): Suggestion[] {
  const ctx = extractContext(query, cursorPosition);
  return getSuggestionsForContext(ctx, sources, options);
}

export function getSuggestionsForContext(ctx: SuggestionContext, sources: SuggestionSources = {}, options: GetSuggestionsOptions = {}): Suggestion[] {
  const maxSuggestions = options.maxSuggestions ?? DEFAULT_MAX_SUGGESTIONS;
  const fuzzyThreshold = options.fuzzyMatchThreshold ?? DEFAULT_FUZZY_THRESHOLD;
  const categoryConfig = sources.suggestionCategories;

  const candidates: Candidate[] = [
    ...(sources.includeBuiltins === false ? [] : collectBuiltins(ctx, categoryConfig)),
    ...collectStatic(sources, ctx, categoryConfig),
    ...collectDynamic(sources, ctx, categoryConfig),
  ];

  const needle = ctx.tokenBeforeCursor.toLowerCase();
  const recentlyUsed = new Set(sources.recentlyUsedValues ?? []);

  type Scored = { c: Candidate; score: number };
  let scored: Scored[] = [];

  if (!needle) {
    scored = candidates.map((c) => ({
      c,
      score: 500 + c.contextBoost + (c.suggestion.priority ?? 0) * 10 + c.sourceWeight + (recentlyUsed.has(c.suggestion.value) ? 20 : 0),
    }));
  } else {
    const exactOrPrefix: Scored[] = [];
    const remainder: Candidate[] = [];
    for (const c of candidates) {
      const valLower = c.suggestion.value.toLowerCase();
      const aliasHit = c.suggestion.aliases?.some((a) => a.toLowerCase() === needle || a.toLowerCase().startsWith(needle));
      if (valLower === needle) {
        exactOrPrefix.push({ c, score: 1000 + c.contextBoost + (c.suggestion.priority ?? 0) * 10 + c.sourceWeight });
      } else if (valLower.startsWith(needle)) {
        exactOrPrefix.push({ c, score: 700 - Math.min(valLower.length, 50) + c.contextBoost + (c.suggestion.priority ?? 0) * 10 + c.sourceWeight });
      } else if (aliasHit) {
        exactOrPrefix.push({ c, score: 650 + c.contextBoost + (c.suggestion.priority ?? 0) * 10 + c.sourceWeight });
      } else {
        remainder.push(c);
      }
    }
    scored = exactOrPrefix;
    if (remainder.length <= fuzzyThreshold) {
      for (const c of remainder) {
        const fz = fuzzyScore(needle, c.suggestion.value);
        if (fz !== null) {
          scored.push({ c, score: fz * 400 + c.contextBoost + (c.suggestion.priority ?? 0) * 10 + c.sourceWeight });
        }
      }
    }
    for (const s of scored) {
      if (recentlyUsed.has(s.c.suggestion.value)) s.score += 20;
    }
  }

  // Dedup by (value, category) — higher-scored (effectively higher-priority-source) entry wins.
  scored.sort((a, b) => b.score - a.score);
  const seen = new Map<string, Scored>();
  for (const s of scored) {
    const key = `${s.c.suggestion.category ?? ''}::${s.c.suggestion.value}`;
    if (!seen.has(key)) seen.set(key, s);
  }

  return Array.from(seen.values())
    .slice(0, maxSuggestions)
    .map((s) => s.c.suggestion);
}
