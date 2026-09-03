export interface Suggestion {
  label: string;
  value: string;
  category?: string;
  description?: string;
  detail?: string;
  insertText?: string;
  aliases?: string[];
  priority?: number;
  keywords?: string[];
  icon?: string;
}

export type SuggestionInput = string | Suggestion;

export interface DynamicSuggestionGroup {
  category: string;
  values: SuggestionInput[];
  contexts?: SuggestionContextMatcher[];
}

export interface SuggestionContextMatcher {
  astContext?: AstContext | AstContext[];
  activeLabel?: string | string[];
}

export type AstContext =
  | 'top-level'
  | 'function-arg'
  | 'label-name'
  | 'label-value'
  | 'duration'
  | 'operator'
  | 'aggregation-grouping'
  | 'unknown';

export interface SuggestionContext {
  query: string;
  cursorPosition: number;
  tokenBeforeCursor: string;
  astContext: AstContext;
  activeLabel?: string;
  activeMetric?: string;
}

export interface SuggestionProviderOptions {
  signal: AbortSignal;
}

export type SuggestionProvider = (context: SuggestionContext, options: SuggestionProviderOptions) => Promise<Suggestion[]>;

export interface SuggestionCategoryConfig {
  [category: string]: {
    enabled?: boolean;
    priorityWeight?: number;
    labelOverrides?: Record<string, string>;
  };
}

export function normalizeSuggestion(input: SuggestionInput, fallbackCategory = 'custom'): Suggestion {
  if (typeof input === 'string') {
    return { label: input, value: input, category: fallbackCategory };
  }
  return { category: fallbackCategory, ...input };
}
