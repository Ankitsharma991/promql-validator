import { StreamLanguage, type StreamParser } from '@codemirror/language';
import { tokenize, TokenType, type Token } from '@promql-validator/core';

interface PromQLStreamState {
  tokens: Token[];
  index: number;
  lineText: string | null;
}

const KEYWORDS = new Set(['by', 'without', 'on', 'ignoring', 'group_left', 'group_right', 'offset', 'bool', 'and', 'or', 'unless']);
const AGGREGATIONS = new Set(['sum', 'avg', 'min', 'max', 'count', 'count_values', 'stddev', 'stdvar', 'topk', 'bottomk', 'quantile', 'group', 'limitk', 'limit_ratio']);

function classify(tok: Token): string | null {
  switch (tok.type) {
    case TokenType.Number:
    case TokenType.Duration:
      return 'number';
    case TokenType.String:
      return 'string';
    case TokenType.Identifier:
      if (KEYWORDS.has(tok.value)) return 'keyword';
      if (AGGREGATIONS.has(tok.value)) return 'keyword';
      return 'variableName';
    case TokenType.LParen:
    case TokenType.RParen:
    case TokenType.LBrace:
    case TokenType.RBrace:
    case TokenType.LBracket:
    case TokenType.RBracket:
      return 'bracket';
    case TokenType.Comma:
    case TokenType.Colon:
      return 'separator';
    case TokenType.At:
      return 'operatorKeyword';
    case TokenType.Illegal:
      return 'invalid';
    default:
      return 'operator';
  }
}

/**
 * Bridges `@promql-validator/core`'s real hand-written lexer into CodeMirror 6's simpler
 * (CM5-style) `StreamParser` interface — reusing the actual tokenizer for highlighting
 * (rather than a second, separately-maintained regex grammar) means syntax highlighting can
 * never drift out of sync with what the validator itself considers a token. Retokenizes
 * the current line once per line (cheap — the tokenizer is sub-millisecond even for long
 * lines, Part 27.1) and caches the result in per-line stream state.
 */
export const promqlStreamParser: StreamParser<PromQLStreamState> = {
  name: 'promql',

  startState(): PromQLStreamState {
    return { tokens: [], index: 0, lineText: null };
  },

  token(stream, state): string | null {
    if (stream.eatSpace()) return null;

    if (state.lineText !== stream.string) {
      state.tokens = tokenize(stream.string);
      state.index = 0;
      state.lineText = stream.string;
    }

    while (state.index < state.tokens.length && state.tokens[state.index]!.end <= stream.pos) {
      state.index++;
    }

    const tok = state.tokens[state.index];
    if (!tok || tok.type === TokenType.EOF) {
      stream.skipToEnd();
      return null;
    }

    if (tok.start > stream.pos) {
      // Shouldn't normally happen once eatSpace() has run, but stay defensive: advance to
      // the token start rather than looping forever on a gap.
      stream.pos = tok.start;
      return null;
    }

    stream.pos = tok.end;
    return classify(tok);
  },
};

/** A ready-to-use CodeMirror 6 `Language` built from the stream parser above. */
export const promqlLanguage = StreamLanguage.define(promqlStreamParser);
