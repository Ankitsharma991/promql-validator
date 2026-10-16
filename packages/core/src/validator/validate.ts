import { Expr } from '../parser/ast.js';
import { parsePromQL } from '../parser/parser.js';
import { expandWithTemplates } from '../dialects/with-templates.js';
import { Diagnostic, ValidationResult } from './diagnostics.js';
import { SemanticValidationOptions, analyzeSemantics, DEFAULT_SEMANTIC_OPTIONS } from './semantic.js';

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

/** 1-based line/column of `offset` in `text`. */
function positionAt(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(Math.max(offset, 0), text.length);
  for (let i = 0; i < end; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: end - lineStart + 1 };
}

/**
 * After the first syntax error the parser is recovering, and the errors that follow are
 * almost always consequences of that one mistake (`rate([5m])` would otherwise report five).
 * Like Prometheus, report only the first syntax error — plus any non-error syntax findings
 * (e.g. duplicate-matcher warnings), which stay meaningful.
 */
function collapseSyntaxErrors(diagnostics: Diagnostic[]): Diagnostic[] {
  let first: Diagnostic | undefined;
  for (const d of diagnostics) {
    if (d.severity === 'error' && (!first || d.start < first.start)) first = d;
  }
  if (!first) return diagnostics;
  return diagnostics.filter((d) => d === first || d.severity !== 'error');
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

  const parsed = parsePromQL(textToParse, dialect);
  const { ast } = parsed;
  const syntaxDiagnostics = collapseSyntaxErrors(parsed.diagnostics);
  const hasSyntaxError = syntaxDiagnostics.some((d) => d.severity === 'error');

  const semanticOptions: SemanticValidationOptions = {
    unknownFunctionSeverity: options.unknownFunctionSeverity ?? DEFAULT_SEMANTIC_OPTIONS.unknownFunctionSeverity,
    customFunctions: options.customFunctions,
    disabledFunctions: options.disabledFunctions,
    dialect,
  };
  // Semantic checks on an error-recovered AST only produce follow-on noise, so they run
  // only once the syntax is clean.
  const semantic = withDiagnostics.length > 0 || hasSyntaxError ? { diagnostics: [], incomplete: false } : analyzeSemantics(ast, semanticOptions);
  // Semantic diagnostics carry offsets only; give them real line/column positions.
  const semanticDiagnostics = semantic.diagnostics.map((d) => ({ ...d, ...positionAt(textToParse, d.start) }));

  const customDiagnostics = (options.validators ?? []).flatMap((v) => v(withDiagnostics.length > 0 ? null : ast, query));

  const diagnostics = [...withDiagnostics, ...syntaxDiagnostics, ...semanticDiagnostics, ...customDiagnostics];
  const valid = !diagnostics.some((d) => d.severity === 'error');

  return { valid, diagnostics, incomplete: withDiagnostics.length > 0 ? false : parsed.incomplete || semantic.incomplete };
}
