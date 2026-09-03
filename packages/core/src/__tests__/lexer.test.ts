import { describe, expect, it } from 'vitest';
import { tokenize } from '../lexer/tokenizer.js';
import { TokenType } from '../lexer/token.js';

describe('tokenize', () => {
  it('tokenizes a simple selector', () => {
    const tokens = tokenize('up{job="api"}');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.Identifier,
      TokenType.LBrace,
      TokenType.Identifier,
      TokenType.Assign,
      TokenType.String,
      TokenType.RBrace,
      TokenType.EOF,
    ]);
  });

  it('tokenizes a compound duration', () => {
    const tokens = tokenize('[1h30m5s]');
    expect(tokens[1]?.type).toBe(TokenType.Duration);
    expect(tokens[1]?.value).toBe('1h30m5s');
  });

  it('distinguishes a number from a duration', () => {
    const tokens = tokenize('topk(5, x)');
    expect(tokens[2]?.type).toBe(TokenType.Number);
    expect(tokens[2]?.value).toBe('5');
  });

  it('never throws and never hangs on unknown characters', () => {
    expect(() => tokenize('metric{a="b"} # not a comment, just weird â')).not.toThrow();
  });

  it('tokenizes two-character operators distinctly from one-character ones', () => {
    const tokens = tokenize('a =~ b != c <= d >= e == f');
    const types = tokens.map((t) => t.type);
    expect(types).toContain(TokenType.EqMatch);
    expect(types).toContain(TokenType.Neq);
    expect(types).toContain(TokenType.Lte);
    expect(types).toContain(TokenType.Gte);
    expect(types).toContain(TokenType.Eq);
  });

  it('supports scientific notation numbers', () => {
    const tokens = tokenize('1e10');
    expect(tokens[0]?.type).toBe(TokenType.Number);
    expect(tokens[0]?.value).toBe('1e10');
  });

  it('tracks line/column across newlines', () => {
    const tokens = tokenize('a\nb');
    const bTok = tokens.find((t) => t.value === 'b');
    expect(bTok?.line).toBe(2);
  });
});
