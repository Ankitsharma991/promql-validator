import { Expr } from '../parser/ast.js';
import { parsePromQL } from '../parser/parser.js';
import { expandWithTemplates } from '../dialects/with-templates.js';
import { Diagnostic, ValidationResult } from './diagnostics.js';
import { SemanticValidationOptions, validateSemantics, DEFAULT_SEMANTIC_OPTIONS } from './semantic.js';

export type Validator = (ast: Expr | null, query: string) => Diagnostic[];

export interface ValidationOptions {
  /** Additional validators run alongside (never instead of) the built-in one. */
  validators?: Validator[];
  /** Escape hatch: skip built-in syntax+semantic validation entirely (custom pipelines only). */
  disableBuiltInValidation?: boolean;
  unknownFunctionSeverity?: SemanticValidationOptions['unknownFunctionSeverity'];
  customFunctions?: string[];
  disabledFunctions?: string[];
  /** Guard against pathological input; queries longer than this skip live parsing (PQ_QUERY_TOO_LONG info diagnostic). */
  maxQueryLength?: number;
  /**
   * Query dialect. `'promql'` (default) targets stable Prometheus PromQL. `'metricsql'`
   * enables a **best-effort, conservative subset** of VictoriaMetrics' MetricsQL superset —
   * `WITH (...)` templates, the `keep_metric_names` modifier, and a curated (not
   * exhaustively verified) extension function dictionary. See METRICSQL_FUNCTIONS' module
   * docstring for exactly what is and isn't covered. Diagnostics for the body of a `WITH`
   * expression are positioned relative to the *expanded* (template-substituted) text, not
   * the original source — a documented limitation of the textual-substitution approach.
   */
  dialect?: 'promql' | 'metricsql';
}

const DEFAULT_MAX_QUERY_LENGTH = 10_000;

export class UnsupportedDialectError extends Error {
  constructor(dialect: string) {
    super(`dialect: '${dialect}' is not supported — expected 'promql' or 'metricsql'.`);
    this.name = 'UnsupportedDialectError';
  }
}

export function validatePromQL(query: string, options: ValidationOptions = {}): ValidationResult {
  const dialect = options.dialect ?? 'promql';
  if (dialect !== 'promql' && dialect !== 'metricsql') {
    throw new UnsupportedDialectError(dialect);
  }

  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return { valid: true, diagnostics: [], incomplete: false };
  }

  const maxLen = options.maxQueryLength ?? DEFAULT_MAX_QUERY_LENGTH;
  if (query.length > maxLen) {
    return {
      valid: true,
      incomplete: false,
      diagnostics: [
        {
          severity: 'info',
          code: 'PQ_QUERY_TOO_LONG',
          message: `Query exceeds ${maxLen} characters; live validation was skipped. Split the query or call validatePromQL() explicitly if you need a result.`,
          start: 0,
          end: Math.min(query.length, 1),
          line: 1,
          column: 1,
        },
      ],
    };
  }

  if (options.disableBuiltInValidation) {
    const diagnostics = (options.validators ?? []).flatMap((v) => v(null, query));
    return { valid: !diagnostics.some((d) => d.severity === 'error'), diagnostics, incomplete: false };
  }

  let textToParse = query;
  let withDiagnostics: Diagnostic[] = [];
  if (dialect === 'metricsql') {
    const withResult = expandWithTemplates(query);
    if (withResult.diagnostics.length > 0) {
      withDiagnostics = withResult.diagnostics;
    } else {
      textToParse = withResult.expanded;
    }
  }

  const { ast, diagnostics: syntaxDiagnostics, incomplete } = parsePromQL(textToParse, dialect);

  const semanticOptions: SemanticValidationOptions = {
    unknownFunctionSeverity: options.unknownFunctionSeverity ?? DEFAULT_SEMANTIC_OPTIONS.unknownFunctionSeverity,
    customFunctions: options.customFunctions,
    disabledFunctions: options.disabledFunctions,
    dialect,
  };
  const semanticDiagnostics = withDiagnostics.length > 0 ? [] : validateSemantics(ast, semanticOptions);

  const customDiagnostics = (options.validators ?? []).flatMap((v) => v(withDiagnostics.length > 0 ? null : ast, query));

  const diagnostics = [...withDiagnostics, ...syntaxDiagnostics, ...semanticDiagnostics, ...customDiagnostics];
  const valid = !diagnostics.some((d) => d.severity === 'error');

  return { valid, diagnostics, incomplete: withDiagnostics.length > 0 ? false : incomplete };
}
