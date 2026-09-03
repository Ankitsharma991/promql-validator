import { Expr } from '../parser/ast.js';
import { parsePromQL } from '../parser/parser.js';
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
   * Query dialect. Only `'promql'` (Prometheus, the default) is implemented. `'metricsql'`
   * (VictoriaMetrics' superset) is a reserved value so the public API won't need a breaking
   * change once it lands — selecting it throws rather than silently validating MetricsQL-only
   * syntax against the PromQL grammar, which would produce misleading false-negative errors.
   */
  dialect?: 'promql' | 'metricsql';
}

const DEFAULT_MAX_QUERY_LENGTH = 10_000;

export class UnsupportedDialectError extends Error {
  constructor(dialect: string) {
    super(`dialect: '${dialect}' is not yet supported — only 'promql' is implemented. MetricsQL support is tracked as Phase 2/Future scope.`);
    this.name = 'UnsupportedDialectError';
  }
}

export function validatePromQL(query: string, options: ValidationOptions = {}): ValidationResult {
  if (options.dialect && options.dialect !== 'promql') {
    throw new UnsupportedDialectError(options.dialect);
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

  const { ast, diagnostics: syntaxDiagnostics, incomplete } = parsePromQL(query);

  const semanticOptions: SemanticValidationOptions = {
    unknownFunctionSeverity: options.unknownFunctionSeverity ?? DEFAULT_SEMANTIC_OPTIONS.unknownFunctionSeverity,
    customFunctions: options.customFunctions,
    disabledFunctions: options.disabledFunctions,
  };
  const semanticDiagnostics = validateSemantics(ast, semanticOptions);

  const customDiagnostics = (options.validators ?? []).flatMap((v) => v(ast, query));

  const diagnostics = [...syntaxDiagnostics, ...semanticDiagnostics, ...customDiagnostics];
  const valid = !diagnostics.some((d) => d.severity === 'error');

  return { valid, diagnostics, incomplete };
}
