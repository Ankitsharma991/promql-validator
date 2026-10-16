import type { Validator } from '../validator/validate.js';
import type { DynamicSuggestionGroup, SuggestionCategoryConfig, SuggestionInput, SuggestionProvider } from '../suggestions/types.js';

/**
 * A bundle of validation rules, dictionary extensions and suggestion sources, e.g. an
 * organization's own `@my-company/promql-plugin` package. It's a plain object you import
 * yourself; the library never fetches or loads plugin code on its own.
 */
export interface PromQLPlugin {
  name: string;
  version?: string;
  validators?: Validator[];
  customFunctions?: string[];
  disabledFunctions?: string[];
  suggestions?: SuggestionInput[];
  dynamicSuggestions?: DynamicSuggestionGroup[];
  suggestionProvider?: SuggestionProvider;
  suggestionCategories?: SuggestionCategoryConfig;
}
