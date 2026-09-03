import { Suggestion, SuggestionContext } from './types.js';

export interface SuggestionCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  keyFn?: (context: SuggestionContext) => string;
}

interface Entry {
  value: Suggestion[];
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000;
const DEFAULT_MAX_ENTRIES = 200;

export function defaultCacheKey(context: SuggestionContext): string {
  return `${context.astContext}::${context.activeLabel ?? ''}::${context.tokenBeforeCursor}`;
}

/** Small in-memory LRU with TTL. Never persists anything to disk/localStorage/network. */
export class SuggestionCache {
  private readonly map = new Map<string, Entry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly keyFn: (context: SuggestionContext) => string;

  constructor(options: SuggestionCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.keyFn = options.keyFn ?? defaultCacheKey;
  }

  get(context: SuggestionContext): Suggestion[] | undefined {
    const key = this.keyFn(context);
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // refresh recency
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(context: SuggestionContext, value: Suggestion[]): void {
    const key = this.keyFn(context);
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      this.map.delete(oldestKey);
    }
  }

  clear(): void {
    this.map.clear();
  }
}
