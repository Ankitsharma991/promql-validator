// ---- Validation ------------------------------------------------------------------------
export { validatePromQL, UnsupportedDialectError } from './validator/validate.js';
export type { ValidationOptions, Validator } from './validator/validate.js';
export { DiagnosticCode } from './validator/diagnostics.js';
export type { Diagnostic, DiagnosticSeverity, ValidationResult, DiagnosticCodeValue } from './validator/diagnostics.js';
export type { SemanticValidationOptions } from './validator/semantic.js';

// ---- Formatting -------------------------------------------------------------------------
export { formatPromQL, PromQLFormatError } from './formatter/format.js';
export type { FormatOptions } from './formatter/format.js';

// ---- Parsing (advanced use — Monaco/CodeMirror adapters, custom validators) --------------
export { parsePromQL, Parser } from './parser/parser.js';
export type { ParseResult } from './parser/parser.js';
export { isSynthetic } from './parser/ast.js';
export type {
  AstNode,
  Expr,
  VectorSelector,
  MatrixSelector,
  SubqueryExpr,
  NumberLiteral,
  StringLiteral,
  Call,
  AggregateExpr,
  BinaryExpr,
  UnaryExpr,
  ParenExpr,
  SyntheticExpr,
  LabelMatcher,
  Duration,
  AtModifier,
  OffsetModifier,
  VectorMatching,
  MatchOp,
} from './parser/ast.js';
export { tokenize } from './lexer/tokenizer.js';
export { TokenType } from './lexer/token.js';
export type { Token, Span } from './lexer/token.js';

// ---- Suggestions ------------------------------------------------------------------------
export { getSuggestions, getSuggestionsForContext } from './suggestions/engine.js';
export type { SuggestionSources, GetSuggestionsOptions } from './suggestions/engine.js';
export { extractContext } from './suggestions/context-extractor.js';
export { normalizeSuggestion } from './suggestions/types.js';
export type {
  Suggestion,
  SuggestionInput,
  DynamicSuggestionGroup,
  SuggestionContextMatcher,
  SuggestionContext,
  SuggestionProvider,
  SuggestionProviderOptions,
  SuggestionCategoryConfig,
  AstContext,
} from './suggestions/types.js';
export { fuzzyScore } from './suggestions/fuzzy.js';
export { SuggestionCache, defaultCacheKey } from './suggestions/cache.js';
export type { SuggestionCacheOptions } from './suggestions/cache.js';
export { AsyncSuggestionController } from './suggestions/async-controller.js';
export type { AsyncSuggestionControllerOptions, AsyncSuggestionState } from './suggestions/async-controller.js';

// ---- Built-in dictionaries (for hosts building their own tooling / docs) -----------------
export { PROMQL_FUNCTIONS, findFunctionSpec, PROMQL_FUNCTION_NAMES } from './suggestions/builtins/functions.js';
export type { FunctionSpec } from './suggestions/builtins/functions.js';
export { PROMQL_AGGREGATIONS, findAggregationSpec, PROMQL_AGGREGATION_NAMES } from './suggestions/builtins/aggregations.js';
export type { AggregationSpec } from './suggestions/builtins/aggregations.js';
export { PROMQL_OPERATORS, COMMON_DURATIONS, DURATION_UNIT_SUGGESTIONS } from './suggestions/builtins/operators.js';
export type { OperatorSpec } from './suggestions/builtins/operators.js';
export { BUILTIN_LABEL_NAMES, BUILTIN_MONITORING_TERMS } from './suggestions/builtins/monitoring.js';
export type { MonitoringTermSpec } from './suggestions/builtins/monitoring.js';
