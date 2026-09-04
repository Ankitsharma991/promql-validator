import { Token, TokenType } from '../lexer/token.js';
import { tokenize } from '../lexer/tokenizer.js';
import { AGGREGATION_OPS } from '../lexer/token.js';
import { AstContext, SuggestionContext } from './types.js';

type FrameKind = 'paren' | 'call' | 'aggregation-args' | 'brace' | 'bracket-range' | 'bracket-subquery' | 'grouping-parens';

interface Frame {
  kind: FrameKind;
  metricName?: string | null;
  pendingLabelValueFor?: string | null;
}

const MATCH_OP_TYPES = new Set<TokenType>([TokenType.Assign, TokenType.EqMatch, TokenType.Neq, TokenType.NeqMatch]);

/**
 * True iff the lexer actually found a matching closing quote for this string token (as
 * opposed to running off the end of the source mid-string, which is how PromQL is
 * unavoidably tokenized while a label value is still being typed, e.g. `service="ap`).
 * Derived purely from the resulting token span — correct because the lexer's own scan
 * only stops early at a genuine closing-quote match, never speculatively.
 */
function isTerminatedString(tok: Token, query: string): boolean {
  return tok.end - tok.start >= 2 && query[tok.end - 1] === query[tok.start];
}

/**
 * Walks the token stream up to `cursorPosition` with a lightweight bracket-stack machine
 * to classify the cursor's grammatical position. Token-based (not a full AST walk) so it
 * stays robust on genuinely malformed/mid-typing input, which is the common case this
 * function is called against.
 */
export function extractContext(query: string, cursorPosition: number): SuggestionContext {
  const tokens = tokenize(query);
  const stack: Frame[] = [];

  let lastIdentifier: Token | null = null; // most recent identifier seen, for metric-name attribution
  let tokenBeforeCursor = '';
  let cursorTokenIndex = -1;

  // Tokens that fully precede the cursor.
  const priorTokens: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok.type === TokenType.EOF) break;
    if (tok.start >= cursorPosition) break;

    if (tok.type === TokenType.String && tok.end >= cursorPosition && !isTerminatedString(tok, query)) {
      // Cursor is inside (or at the trailing edge of) a label value that's still being
      // typed — e.g. `service="ap` with the cursor at the end. Extract the raw partial
      // content directly from the source (not the lexer's unescaped `.value`, so offsets
      // stay simple) and deliberately do NOT add this token to `priorTokens`: the
      // bracket-stack walk below must still see this label's match-operator as the most
      // recent thing that happened, so `pendingLabelValueFor` stays set and the context
      // correctly stays `label-value` instead of flipping back to `label-name`.
      cursorTokenIndex = i;
      tokenBeforeCursor = query.slice(tok.start + 1, cursorPosition);
      continue;
    }

    if (tok.end <= cursorPosition) {
      priorTokens.push(tok);
    } else if (tok.start < cursorPosition && cursorPosition < tok.end) {
      // Cursor lands inside this token (typing/editing mid-word). For a String token,
      // `.value` is offset by one from the source span (the opening quote has no
      // corresponding character in the unescaped value) — slice the raw source instead of
      // `.value` so the prefix length is right regardless of that delimiter.
      cursorTokenIndex = i;
      tokenBeforeCursor = tok.type === TokenType.String ? query.slice(tok.start + 1, cursorPosition) : tok.value.slice(0, cursorPosition - tok.start);
    }
  }
  void cursorTokenIndex;

  if (!tokenBeforeCursor && priorTokens.length > 0) {
    const last = priorTokens[priorTokens.length - 1]!;
    if (last.end === cursorPosition && (last.type === TokenType.Identifier || last.type === TokenType.Number || last.type === TokenType.Duration)) {
      tokenBeforeCursor = last.value;
    }
  }

  for (const tok of priorTokens) {
    switch (tok.type) {
      case TokenType.Identifier:
        lastIdentifier = tok;
        break;
      case TokenType.LParen: {
        const top = stack[stack.length - 1];
        if (lastIdentifier && AGGREGATION_OPS.has(lastIdentifier.value)) {
          stack.push({ kind: 'aggregation-args' });
        } else if (lastIdentifier && (lastIdentifier.value === 'by' || lastIdentifier.value === 'without' || lastIdentifier.value === 'on' || lastIdentifier.value === 'ignoring' || lastIdentifier.value === 'group_left' || lastIdentifier.value === 'group_right')) {
          stack.push({ kind: 'grouping-parens' });
        } else if (lastIdentifier) {
          stack.push({ kind: 'call' });
        } else {
          stack.push({ kind: 'paren' });
        }
        void top;
        break;
      }
      case TokenType.RParen:
        if (stack.length > 0 && (stack[stack.length - 1]!.kind === 'call' || stack[stack.length - 1]!.kind === 'aggregation-args' || stack[stack.length - 1]!.kind === 'paren' || stack[stack.length - 1]!.kind === 'grouping-parens')) {
          stack.pop();
        }
        break;
      case TokenType.LBrace: {
        const metricName = lastIdentifier ? lastIdentifier.value : null;
        stack.push({ kind: 'brace', metricName, pendingLabelValueFor: null });
        break;
      }
      case TokenType.RBrace:
        if (stack.length > 0 && stack[stack.length - 1]!.kind === 'brace') stack.pop();
        break;
      case TokenType.LBracket:
        stack.push({ kind: 'bracket-range' });
        break;
      case TokenType.RBracket:
        if (stack.length > 0 && (stack[stack.length - 1]!.kind === 'bracket-range' || stack[stack.length - 1]!.kind === 'bracket-subquery')) {
          stack.pop();
        }
        break;
      case TokenType.Colon: {
        const top = stack[stack.length - 1];
        if (top && top.kind === 'bracket-range') top.kind = 'bracket-subquery';
        break;
      }
      case TokenType.Comma: {
        const top = stack[stack.length - 1];
        if (top && top.kind === 'brace') top.pendingLabelValueFor = null;
        break;
      }
      default:
        if (MATCH_OP_TYPES.has(tok.type)) {
          const top = stack[stack.length - 1];
          if (top && top.kind === 'brace' && lastIdentifier) {
            top.pendingLabelValueFor = lastIdentifier.value;
          }
        } else if (tok.type === TokenType.String) {
          const top = stack[stack.length - 1];
          if (top && top.kind === 'brace') top.pendingLabelValueFor = null;
        }
        break;
    }
  }

  const top = stack[stack.length - 1];
  let astContext: AstContext = 'unknown';
  let activeLabel: string | undefined;
  let activeMetric: string | undefined;

  if (top?.kind === 'brace') {
    activeMetric = top.metricName ?? undefined;
    if (top.pendingLabelValueFor) {
      astContext = 'label-value';
      activeLabel = top.pendingLabelValueFor;
    } else {
      astContext = 'label-name';
    }
  } else if (top?.kind === 'bracket-range' || top?.kind === 'bracket-subquery') {
    astContext = 'duration';
  } else if (top?.kind === 'grouping-parens') {
    astContext = 'aggregation-grouping';
  } else if (top?.kind === 'call' || top?.kind === 'aggregation-args') {
    astContext = 'function-arg';
  } else {
    // top is 'paren' or the stack is empty: decide top-level vs operator position by
    // looking at the last meaningful token before the cursor.
    const last = priorTokens[priorTokens.length - 1];
    const isOperandEnd = last && [TokenType.RParen, TokenType.RBrace, TokenType.RBracket, TokenType.Number, TokenType.String, TokenType.Identifier, TokenType.Duration].includes(last.type);
    const lastIsKeywordOperator = last?.type === TokenType.Identifier && ['and', 'or', 'unless', 'by', 'without', 'on', 'ignoring', 'offset', 'bool'].includes(last.value);
    if (isOperandEnd && !lastIsKeywordOperator && !tokenBeforeCursor) {
      astContext = 'operator';
    } else {
      astContext = 'top-level';
    }
  }

  return {
    query,
    cursorPosition,
    tokenBeforeCursor,
    astContext,
    ...(activeLabel ? { activeLabel } : {}),
    ...(activeMetric ? { activeMetric } : {}),
  };
}
