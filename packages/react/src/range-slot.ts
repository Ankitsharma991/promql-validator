import { tokenize, TokenType, findFunctionSpec, METRICSQL_FUNCTIONS, type FunctionSpec, type Suggestion } from '@promql-validator/core';

const METRIC_NAME = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;

// Categories whose suggestions are never a bare metric selector.
const NON_SELECTOR_CATEGORIES = new Set(['promql-function', 'function', 'aggregation', 'operator', 'modifier', 'keyword', 'duration', 'label-name', 'label', 'monitoring-term']);

function lookupFunction(name: string, dialect: 'promql' | 'metricsql'): FunctionSpec | undefined {
  if (dialect === 'metricsql') {
    const ext = METRICSQL_FUNCTIONS.find((f) => f.name === name);
    if (ext) return ext;
  }
  return findFunctionSpec(name);
}

interface Frame {
  type: TokenType;
  fn?: string;
  argIndex: number;
}

/**
 * True when the text from `slotStart` onward is being typed directly into an empty
 * range-vector argument slot — `rate(|)`, `quantile_over_time(0.9, |)` — i.e. the slot
 * holds nothing before the token being completed and nothing but `)`/`,` after it.
 */
export function isRangeVectorArgSlot(value: string, slotStart: number, slotEnd: number, dialect: 'promql' | 'metricsql' = 'promql'): boolean {
  const after = value.slice(slotEnd).trimStart();
  if (after !== '' && !after.startsWith(')') && !after.startsWith(',')) return false;

  const stack: Frame[] = [];
  let prev: { type: TokenType; value: string } | undefined;
  let last: TokenType | undefined;
  for (const tok of tokenize(value.slice(0, slotStart))) {
    if (tok.type === TokenType.EOF) break;
    switch (tok.type) {
      case TokenType.LParen:
        stack.push({ type: tok.type, fn: prev?.type === TokenType.Identifier ? prev.value : undefined, argIndex: 0 });
        break;
      case TokenType.LBrace:
      case TokenType.LBracket:
        stack.push({ type: tok.type, argIndex: 0 });
        break;
      case TokenType.RParen:
      case TokenType.RBrace:
      case TokenType.RBracket:
        stack.pop();
        break;
      case TokenType.Comma: {
        const top = stack[stack.length - 1];
        if (top) top.argIndex++;
        break;
      }
    }
    prev = tok;
    last = tok.type;
  }

  // The slot must start right after the call's `(` or an argument-separating `,`.
  if (last !== TokenType.LParen && last !== TokenType.Comma) return false;
  const frame = stack[stack.length - 1];
  if (!frame || frame.type !== TokenType.LParen || !frame.fn) return false;
  const spec = lookupFunction(frame.fn, dialect);
  return Boolean(spec?.rangeVectorArg) && frame.argIndex === (spec!.rangeVectorArgIndex ?? 0);
}

/** Whether accepting `s` inserts a bare metric name (as opposed to a function, keyword, …). */
export function isMetricNameSuggestion(s: Suggestion): boolean {
  const text = s.insertText ?? s.value;
  return METRIC_NAME.test(text) && !NON_SELECTOR_CATEGORIES.has(s.category ?? '');
}
