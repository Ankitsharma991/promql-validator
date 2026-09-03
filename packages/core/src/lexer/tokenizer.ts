import { Token, TokenType } from './token.js';

const DURATION_UNITS = ['ms', 'ns', 'us', 'µs', 's', 'm', 'h', 'd', 'w', 'y'];
// Sorted longest-first so greedy matching prefers e.g. "ms" over "m" then "s".
const SORTED_UNITS = [...DURATION_UNITS].sort((a, b) => b.length - a.length);

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

// ':' is allowed only as a *continuation* character (recording-rule metric names like
// `node:cpu:ratio`), never as the first character of an identifier — that keeps a bare
// leading ':' (the subquery step separator in `[5m:1m]`) lexing as its own Colon token
// instead of being swallowed into an identifier.
function isIdentContinue(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch) || ch === ':';
}

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === 'µ';
}

/**
 * Hand-written, error-tolerant PromQL lexer. Never throws: any character it
 * cannot classify becomes a single-character `Illegal` token so the parser
 * (and ultimately the validator) can surface a diagnostic instead of crashing.
 */
export class Lexer {
  private readonly src: string;
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.src = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    for (;;) {
      const tok = this.next();
      tokens.push(tok);
      if (tok.type === TokenType.EOF) break;
    }
    return tokens;
  }

  private peekChar(offset = 0): string {
    return this.src[this.pos + offset] ?? '';
  }

  private advance(): string {
    const ch = this.src[this.pos] ?? '';
    this.pos++;
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private skipWhitespaceAndComments(): void {
    for (;;) {
      const ch = this.peekChar();
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.advance();
        continue;
      }
      break;
    }
  }

  private makeToken(type: TokenType, start: number, startLine: number, startCol: number, value: string): Token {
    return { type, value, start, end: this.pos, line: startLine, column: startCol };
  }

  private next(): Token {
    this.skipWhitespaceAndComments();
    const start = this.pos;
    const startLine = this.line;
    const startCol = this.column;

    if (this.pos >= this.src.length) {
      return this.makeToken(TokenType.EOF, start, startLine, startCol, '');
    }

    const ch = this.peekChar();

    if (isDigit(ch) || (ch === '.' && isDigit(this.peekChar(1)))) {
      return this.lexNumberOrDuration(start, startLine, startCol);
    }

    if (isIdentStart(ch)) {
      return this.lexIdentifier(start, startLine, startCol);
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      return this.lexString(start, startLine, startCol, ch);
    }

    // Two-character operators first.
    const two = ch + this.peekChar(1);
    switch (two) {
      case '==':
        this.advance();
        this.advance();
        return this.makeToken(TokenType.Eq, start, startLine, startCol, two);
      case '!=':
        this.advance();
        this.advance();
        return this.makeToken(TokenType.Neq, start, startLine, startCol, two);
      case '<=':
        this.advance();
        this.advance();
        return this.makeToken(TokenType.Lte, start, startLine, startCol, two);
      case '>=':
        this.advance();
        this.advance();
        return this.makeToken(TokenType.Gte, start, startLine, startCol, two);
      case '=~':
        this.advance();
        this.advance();
        return this.makeToken(TokenType.EqMatch, start, startLine, startCol, two);
      case '!~':
        this.advance();
        this.advance();
        return this.makeToken(TokenType.NeqMatch, start, startLine, startCol, two);
      default:
        break;
    }

    const single: Partial<Record<string, TokenType>> = {
      '(': TokenType.LParen,
      ')': TokenType.RParen,
      '{': TokenType.LBrace,
      '}': TokenType.RBrace,
      '[': TokenType.LBracket,
      ']': TokenType.RBracket,
      ',': TokenType.Comma,
      ':': TokenType.Colon,
      '@': TokenType.At,
      '+': TokenType.Add,
      '-': TokenType.Sub,
      '*': TokenType.Mul,
      '/': TokenType.Div,
      '%': TokenType.Mod,
      '^': TokenType.Pow,
      '=': TokenType.Assign,
      '<': TokenType.Lt,
      '>': TokenType.Gt,
    };
    const type = single[ch];
    if (type) {
      this.advance();
      return this.makeToken(type, start, startLine, startCol, ch);
    }

    // Unknown character: emit Illegal and move on so the lexer never gets stuck.
    this.advance();
    return this.makeToken(TokenType.Illegal, start, startLine, startCol, ch);
  }

  private lexNumberOrDuration(start: number, startLine: number, startCol: number): Token {
    // Hex literal.
    if (this.peekChar() === '0' && (this.peekChar(1) === 'x' || this.peekChar(1) === 'X')) {
      this.advance();
      this.advance();
      while (/[0-9a-fA-F]/.test(this.peekChar())) this.advance();
      return this.makeToken(TokenType.Number, start, startLine, startCol, this.src.slice(start, this.pos));
    }

    const numStart = this.pos;
    while (isDigit(this.peekChar())) this.advance();
    if (this.peekChar() === '.' && isDigit(this.peekChar(1))) {
      this.advance();
      while (isDigit(this.peekChar())) this.advance();
    }
    if ((this.peekChar() === 'e' || this.peekChar() === 'E') && (isDigit(this.peekChar(1)) || ((this.peekChar(1) === '+' || this.peekChar(1) === '-') && isDigit(this.peekChar(2))))) {
      this.advance();
      if (this.peekChar() === '+' || this.peekChar() === '-') this.advance();
      while (isDigit(this.peekChar())) this.advance();
    }
    const numText = this.src.slice(numStart, this.pos);

    // Try to extend into a compound duration: (\d+unit)+  e.g. "5m", "1h30m5s".
    if (isAlpha(this.peekChar())) {
      const savedPos = this.pos;
      const savedLine = this.line;
      const savedCol = this.column;
      if (this.tryConsumeDurationUnit()) {
        // Keep consuming further "<digits><unit>" components.
        for (;;) {
          const beforeComponent = this.pos;
          if (!isDigit(this.peekChar())) break;
          const compNumStart = this.pos;
          while (isDigit(this.peekChar())) this.advance();
          if (!isAlpha(this.peekChar())) {
            // Not a valid follow-up component; back out to before this digit run.
            this.pos = beforeComponent;
            this.line = savedLine; // approximation; durations rarely span lines
            this.column = savedCol;
            break;
          }
          const before = this.pos;
          if (!this.tryConsumeDurationUnit()) {
            this.pos = compNumStart;
            break;
          }
          void before;
        }
        // Reject if immediately followed by more identifier chars (e.g. "5ms_foo" is not a
        // clean duration) — but NOT ':', which legitimately follows a duration in subquery
        // syntax like `[5m:1m]` and must remain its own Colon token, not get swallowed into
        // an identifier (identifiers otherwise allow ':' for recording-rule metric names).
        const trailing = this.peekChar();
        if (!(isAlpha(trailing) || isDigit(trailing) || trailing === '_')) {
          return this.makeToken(TokenType.Duration, start, startLine, startCol, this.src.slice(start, this.pos));
        }
        // Fall through: not actually a clean duration, rewind and just emit the number.
        this.pos = savedPos;
        this.line = savedLine;
        this.column = savedCol;
      } else {
        this.pos = savedPos;
        this.line = savedLine;
        this.column = savedCol;
      }
    }

    return this.makeToken(TokenType.Number, start, startLine, startCol, numText);
  }

  /** Attempts to consume one duration unit (e.g. "ms", "s") at the current position. */
  private tryConsumeDurationUnit(): boolean {
    for (const unit of SORTED_UNITS) {
      if (this.src.startsWith(unit, this.pos)) {
        for (let i = 0; i < unit.length; i++) this.advance();
        return true;
      }
    }
    return false;
  }

  private lexIdentifier(start: number, startLine: number, startCol: number): Token {
    while (isIdentContinue(this.peekChar())) this.advance();
    const text = this.src.slice(start, this.pos);
    return this.makeToken(TokenType.Identifier, start, startLine, startCol, text);
  }

  private lexString(start: number, startLine: number, startCol: number, quote: string): Token {
    this.advance(); // opening quote
    let value = '';
    const raw = quote === '`';
    for (;;) {
      const ch = this.peekChar();
      if (ch === '' /* EOF */) {
        // Unterminated string: stop, let the validator flag it via the raw text.
        break;
      }
      if (ch === quote) {
        this.advance();
        break;
      }
      if (!raw && ch === '\\') {
        this.advance();
        const esc = this.advance();
        switch (esc) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          case '`':
            value += '`';
            break;
          default:
            value += esc;
        }
        continue;
      }
      value += this.advance();
    }
    return this.makeToken(TokenType.String, start, startLine, startCol, value);
  }
}

export function tokenize(source: string): Token[] {
  return new Lexer(source).tokenize();
}
