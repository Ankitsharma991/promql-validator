import { tokenize } from '../lexer/tokenizer.js';
import { TokenType } from '../lexer/token.js';
import { Diagnostic, DiagnosticCode, ValidationResult } from './diagnostics.js';

export interface QuickFix {
  label: string;
  apply(query: string): { value: string; cursorPosition: number };
}

const CLOSER_FOR_OPENER: Partial<Record<TokenType, string>> = {
  [TokenType.LParen]: ')',
  [TokenType.LBrace]: '}',
  [TokenType.LBracket]: ']',
};
const OPENERS = new Set<TokenType>([TokenType.LParen, TokenType.LBrace, TokenType.LBracket]);
const CLOSERS: Partial<Record<TokenType, TokenType>> = {
  [TokenType.RParen]: TokenType.LParen,
  [TokenType.RBrace]: TokenType.LBrace,
  [TokenType.RBracket]: TokenType.LBracket,
};

/**
 * Finds the innermost bracket that's still open at end-of-input, re-derived by actually
 * walking the token stream (not by parsing our own diagnostic message text — codes/structure
 * are the stable contract, prose isn't) — used for the `PQ_UNCLOSED_BRACKET` quick-fix.
 */
function findUnclosedOpener(query: string): TokenType | null {
  const stack: TokenType[] = [];
  for (const tok of tokenize(query)) {
    if (OPENERS.has(tok.type)) stack.push(tok.type);
    else if (CLOSERS[tok.type] !== undefined) {
      if (stack.length > 0 && stack[stack.length - 1] === CLOSERS[tok.type]) stack.pop();
    }
  }
  return stack.length > 0 ? stack[stack.length - 1]! : null;
}

/**
 * Returns a one-click fix for a diagnostic, when one can be derived with high confidence.
 * Not every diagnostic has one (e.g. PQ_WRONG_ARITY requires knowing the author's actual
 * intent, which isn't safely inferable) — `null` means "no confident automatic fix."
 *
 * Note: `PQ_UNCLOSED_BRACKET` is deliberately **not** handled here. It only ever fires as
 * an *error* diagnostic for a genuine bracket-type mismatch (e.g. `rate(x[5m)` — a `[`
 * closed with `)`), where a safe, unambiguous single-character fix generally isn't
 * derivable. The common, safe case — a bracket left open all the way to end-of-input while
 * the user is still typing — is by design classified as `incomplete` with *no* error
 * diagnostic at all (Part 29), so it can't be reached through this diagnostic-anchored API;
 * use `getIncompleteBracketFix()` for that case instead.
 */
export function getQuickFix(diagnostic: Diagnostic): QuickFix | null {
  switch (diagnostic.code) {
    case DiagnosticCode.MissingLabelValue: {
      // `diagnostic.start` (not `.end`) — this diagnostic's span covers whatever token
      // was found instead of a value (e.g. the `}` or `,` right after `=`), so `.start` is
      // "immediately before that token," which is exactly where the value belongs.
      const pos = diagnostic.start;
      return {
        label: 'Insert an empty value ""',
        apply(q: string) {
          const value = q.slice(0, pos) + '""' + q.slice(pos);
          return { value, cursorPosition: pos + 1 };
        },
      };
    }
    case DiagnosticCode.InvalidDuration: {
      const pos = diagnostic.end;
      return {
        label: "Add unit 'm' (minutes)",
        apply(q: string) {
          const value = q.slice(0, pos) + 'm' + q.slice(pos);
          return { value, cursorPosition: pos + 1 };
        },
      };
    }
    case DiagnosticCode.UnknownFunction: {
      // "Did you mean 'rate'?" — reuse the same edit-distance suggestion already computed
      // by the semantic validator (Part 13.2) rather than recomputing it; only offered when
      // that suggestion is actually present, so this is never a guess.
      const match = diagnostic.suggestion ? /Did you mean '([a-zA-Z_][a-zA-Z0-9_]*)'\?/.exec(diagnostic.suggestion) : null;
      const replacement = match?.[1];
      if (!replacement) return null;
      const { start, end } = diagnostic;
      return {
        label: `Replace with '${replacement}'`,
        apply(q: string) {
          const value = q.slice(0, start) + replacement + q.slice(end);
          return { value, cursorPosition: start + replacement.length };
        },
      };
    }
    default:
      return null;
  }
}

/**
 * A "close it for me" fix for the common mid-typing case — a query still `incomplete`
 * (Part 29) with a bracket left open all the way to end-of-input, e.g. `rate(x[5m`. Always
 * safe to apply (appending the correct closer for whatever's innermost-still-open can never
 * change the meaning of what's already been typed), which is exactly why it's *not* folded
 * into `getQuickFix()`: that function is diagnostic-anchored, and this case produces no
 * diagnostic to anchor to.
 */
export function getIncompleteBracketFix(result: Pick<ValidationResult, 'incomplete'>, query: string): QuickFix | null {
  if (!result.incomplete) return null;
  const openerType = findUnclosedOpener(query);
  const closer = openerType ? CLOSER_FOR_OPENER[openerType] : undefined;
  if (!closer) return null;
  return {
    label: `Insert missing '${closer}'`,
    apply(q: string) {
      return { value: q + closer, cursorPosition: q.length + 1 };
    },
  };
}
