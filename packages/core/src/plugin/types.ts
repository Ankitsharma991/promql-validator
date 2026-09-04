import type { Validator } from '../validator/validate.js';
import type { DynamicSuggestionGroup, SuggestionCategoryConfig, SuggestionInput, SuggestionProvider } from '../suggestions/types.js';

/**
 * A distributable bundle of custom validation rules, dictionary extensions, and/or
 * suggestion sources — e.g. an organization's own "@my-company/promql-plugin" package
 * exporting one of these. Deliberately a **plain data object**, not a dynamically-loaded
 * module: this package never fetches or executes remote code (Part 26 Privacy) — a plugin
 * is just your own already-imported, already-trusted JS object, composed declaratively.
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
