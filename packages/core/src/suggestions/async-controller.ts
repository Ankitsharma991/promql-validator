import { SuggestionCache, SuggestionCacheOptions } from './cache.js';
import { Suggestion, SuggestionContext, SuggestionProvider } from './types.js';

export interface AsyncSuggestionControllerOptions {
  provider: SuggestionProvider;
  debounceMs?: number;
  cache?: SuggestionCacheOptions | false;
}

export interface AsyncSuggestionState {
  status: 'idle' | 'loading' | 'success' | 'error';
  results: Suggestion[];
  error?: unknown;
}

const DEFAULT_DEBOUNCE_MS = 80;

/**
 * Orchestrates a host-supplied async `SuggestionProvider`: debounces invocation,
 * guarantees the previous in-flight call is aborted when a new one starts, and — since
 * we cannot force provider code to honor `AbortSignal` — discards any response that
 * resolves out of order via a monotonically increasing request sequence number. This is
 * framework-agnostic: the React hook that wraps this class only owns re-render wiring.
 */
export class AsyncSuggestionController {
  private readonly provider: SuggestionProvider;
  private readonly debounceMs: number;
  private readonly cache: SuggestionCache | null;

  private sequence = 0;
  private latestAppliedSequence = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;
  private onStateChange: ((state: AsyncSuggestionState) => void) | null = null;

  constructor(options: AsyncSuggestionControllerOptions) {
    this.provider = options.provider;
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.cache = options.cache === false ? null : new SuggestionCache(options.cache);
  }

  subscribe(listener: (state: AsyncSuggestionState) => void): () => void {
    this.onStateChange = listener;
    return () => {
      if (this.onStateChange === listener) this.onStateChange = null;
    };
  }

  private emit(state: AsyncSuggestionState): void {
    this.onStateChange?.(state);
  }

  /** Schedules a (debounced) fetch for `context`. Safe to call on every keystroke. */
  request(context: SuggestionContext): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    const cached = this.cache?.get(context);
    if (cached) {
      this.emit({ status: 'success', results: cached });
      return;
    }

    this.debounceTimer = setTimeout(() => {
      void this.execute(context);
    }, this.debounceMs);
  }

  private async execute(context: SuggestionContext): Promise<void> {
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    const mySequence = ++this.sequence;

    this.emit({ status: 'loading', results: [] });

    try {
      const results = await this.provider(context, { signal: controller.signal });
      if (mySequence < this.latestAppliedSequence) return; // superseded by a later response already applied
      this.latestAppliedSequence = mySequence;
      const safe = sanitizeResults(results);
      this.cache?.set(context, safe);
      this.emit({ status: 'success', results: safe });
    } catch (err) {
      if (controller.signal.aborted) return; // expected: a newer request superseded this one
      if (mySequence < this.latestAppliedSequence) return;
      this.emit({ status: 'error', results: [], error: err });
    }
  }

  dispose(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.abortController?.abort();
    this.onStateChange = null;
  }
}

/** Defensively coerces untrusted provider output into valid Suggestion objects, dropping malformed entries. */
function sanitizeResults(results: unknown): Suggestion[] {
  if (!Array.isArray(results)) return [];
  const out: Suggestion[] = [];
  for (const item of results) {
    if (item && typeof item === 'object' && typeof (item as Suggestion).label === 'string' && typeof (item as Suggestion).value === 'string') {
      const s = item as Suggestion;
      out.push({
        label: String(s.label).slice(0, 200),
        value: String(s.value).slice(0, 200),
        category: typeof s.category === 'string' ? s.category : undefined,
        description: typeof s.description === 'string' ? s.description.slice(0, 500) : undefined,
        detail: typeof s.detail === 'string' ? s.detail.slice(0, 200) : undefined,
        insertText: typeof s.insertText === 'string' ? s.insertText : undefined,
        aliases: Array.isArray(s.aliases) ? s.aliases.filter((a) => typeof a === 'string').slice(0, 20) : undefined,
        priority: typeof s.priority === 'number' ? s.priority : undefined,
        keywords: Array.isArray(s.keywords) ? s.keywords.filter((k) => typeof k === 'string').slice(0, 20) : undefined,
        icon: typeof s.icon === 'string' ? s.icon : undefined,
      });
    }
  }
  return out;
}
