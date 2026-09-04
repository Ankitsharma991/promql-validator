import { Expr, isSynthetic } from '../parser/ast.js';
import { findFunctionSpec, PROMQL_FUNCTION_NAMES, type FunctionSpec } from '../suggestions/builtins/functions.js';
import { METRICSQL_FUNCTIONS, METRICSQL_FUNCTION_NAMES } from '../dialects/metricsql-functions.js';
import { Diagnostic, DiagnosticCode, DiagnosticSeverity } from './diagnostics.js';

export interface SemanticValidationOptions {
  unknownFunctionSeverity: 'warning' | 'error' | 'off';
  customFunctions?: string[];
  disabledFunctions?: string[];
  dialect?: 'promql' | 'metricsql';
}

function findFunctionSpecForDialect(name: string, dialect: 'promql' | 'metricsql'): FunctionSpec | undefined {
  if (dialect === 'metricsql') {
    const ext = METRICSQL_FUNCTIONS.find((f) => f.name === name);
    if (ext) return ext;
  }
  return findFunctionSpec(name);
}

export const DEFAULT_SEMANTIC_OPTIONS: SemanticValidationOptions = {
  unknownFunctionSeverity: 'warning',
};

/** Bounded edit distance, capped so a wildly different string never pays full O(n*m) cost. */
function editDistanceWithin(a: string, b: string, max: number): number | null {
  if (Math.abs(a.length - b.length) > max) return null;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = dp[0]!;
    dp[0] = i;
    let rowMin = dp[0];
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1] ? prevDiag : 1 + Math.min(prevDiag, dp[j]!, dp[j - 1]!);
      rowMin = Math.min(rowMin, dp[j]!);
      prevDiag = temp;
    }
    if (rowMin > max) return null;
  }
  const result = dp[b.length]!;
  return result <= max ? result : null;
}

function closestFunctionName(name: string, known: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const candidate of known) {
    const dist = editDistanceWithin(name, candidate, 2);
    if (dist !== null && dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

export function validateSemantics(ast: Expr, options: SemanticValidationOptions = DEFAULT_SEMANTIC_OPTIONS): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const dialect = options.dialect ?? 'promql';
  const known = new Set(PROMQL_FUNCTION_NAMES);
  if (dialect === 'metricsql') for (const f of METRICSQL_FUNCTION_NAMES) known.add(f);
  for (const f of options.customFunctions ?? []) known.add(f);
  for (const f of options.disabledFunctions ?? []) known.delete(f);

  function push(severity: DiagnosticSeverity, code: string, message: string, node: { start: number; end: number }, suggestion?: string) {
    diagnostics.push({
      severity,
      code,
      message,
      start: node.start,
      end: Math.max(node.end, node.start + 1),
      line: 1,
      column: 1,
      ...(suggestion ? { suggestion } : {}),
    });
  }

  function isRangeVectorLike(expr: Expr): boolean {
    return expr.type === 'MatrixSelector' || expr.type === 'SubqueryExpr';
  }

  function visit(node: Expr): void {
    if (isSynthetic(node)) return;

    switch (node.type) {
      case 'Call': {
        if (options.disabledFunctions?.includes(node.funcName)) {
          push('error', DiagnosticCode.UnknownFunction, `Function '${node.funcName}' has been disabled.`, node.funcNameSpan);
        } else if (!known.has(node.funcName)) {
          if (options.unknownFunctionSeverity !== 'off') {
            const did = closestFunctionName(node.funcName, known);
            push(
              options.unknownFunctionSeverity,
              DiagnosticCode.UnknownFunction,
              `Unknown function '${node.funcName}'.`,
              node.funcNameSpan,
              did ? `Did you mean '${did}'?` : undefined,
            );
          }
        } else {
          const spec = findFunctionSpecForDialect(node.funcName, dialect);
          // Skip arity/type checks while the call is still open mid-typing (`rate(` with no
          // closing paren yet) — the argument list isn't finalized, so it isn't an error yet.
          if (spec && !node.openParen) {
            const argc = node.args.length;
            if (argc < spec.minArgs || argc > spec.maxArgs) {
              const expected = spec.minArgs === spec.maxArgs ? `exactly ${spec.minArgs}` : spec.maxArgs === Infinity ? `at least ${spec.minArgs}` : `between ${spec.minArgs} and ${spec.maxArgs}`;
              push('error', DiagnosticCode.WrongArity, `Function '${node.funcName}' expects ${expected} argument(s), got ${argc}.`, node);
            }
            if (spec.rangeVectorArg && node.args[0] && !isSynthetic(node.args[0]) && !isRangeVectorLike(node.args[0]!)) {
              push('error', DiagnosticCode.WrongArgType, `Function '${node.funcName}' expects a range vector (e.g. 'metric[5m]') as its argument, got an instant vector.`, node.args[0]!);
            }
          }
        }
        for (const arg of node.args) visit(arg);
        break;
      }
      case 'AggregateExpr': {
        if (node.expr) visit(node.expr);
        if (node.param) visit(node.param);
        break;
      }
      case 'BinaryExpr': {
        if (node.matching?.card && ['and', 'or', 'unless'].includes(node.op)) {
          push('error', DiagnosticCode.InvalidVectorMatch, `'group_left'/'group_right' cannot be used with the set operator '${node.op}'.`, node.matching);
        }
        visit(node.lhs);
        if (node.rhs) visit(node.rhs);
        break;
      }
      case 'UnaryExpr':
        if (node.expr) visit(node.expr);
        break;
      case 'ParenExpr':
        if (node.expr) visit(node.expr);
        break;
      case 'MatrixSelector':
        visit(node.vector);
        break;
      case 'SubqueryExpr':
        visit(node.expr);
        break;
      case 'VectorSelector':
      case 'NumberLiteral':
      case 'StringLiteral':
        break;
    }
  }

  visit(ast);
  return diagnostics;
}
