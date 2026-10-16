import { Token, TokenType, Span } from '../lexer/token.js';
import { tokenize } from '../lexer/tokenizer.js';
import { AGGREGATION_OPS } from '../lexer/token.js';
import { Diagnostic, DiagnosticCode } from '../validator/diagnostics.js';
import {
  AggregateExpr,
  AtModifier,
  BinaryExpr,
  Call,
  Duration,
  Expr,
  LabelMatcher,
  MatchOp,
  MatrixSelector,
  NumberLiteral,
  OffsetModifier,
  ParenExpr,
  StringLiteral,
  SubqueryExpr,
  SyntheticExpr,
  UnaryExpr,
  VectorMatching,
  VectorSelector,
  isSynthetic,
} from './ast.js';

export interface ParseResult {
  ast: Expr;
  diagnostics: Diagnostic[];
  incomplete: boolean;
}

const MAX_NESTING_DEPTH = 100;
const MAX_TOKENS = 50_000;

const DURATION_UNIT_MS: Record<string, number> = {
  ns: 1e-6,
  us: 1e-3,
  µs: 1e-3,
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 365 * 86_400_000,
};

function parseDurationText(text: string): number | null {
  const re = /(\d+)(ms|ns|us|µs|s|m|h|d|w|y)/g;
  let total = 0;
  let matchedAny = false;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index !== lastEnd) return null; // stray characters between components
    const amount = m[1];
    const unit = m[2];
    if (!amount || !unit) return null;
    total += Number(amount) * (DURATION_UNIT_MS[unit] ?? NaN);
    matchedAny = true;
    lastEnd = re.lastIndex;
  }
  if (!matchedAny || lastEnd !== text.length) return null;
  return total;
}

interface BinaryOpInfo {
  op: string;
  precedence: number;
  rightAssoc: boolean;
  tokenCount: 1;
}

function getBinaryOpInfo(tok: Token): BinaryOpInfo | null {
  switch (tok.type) {
    case TokenType.Add:
      return { op: '+', precedence: 4, rightAssoc: false, tokenCount: 1 };
    case TokenType.Sub:
      return { op: '-', precedence: 4, rightAssoc: false, tokenCount: 1 };
    case TokenType.Mul:
      return { op: '*', precedence: 5, rightAssoc: false, tokenCount: 1 };
    case TokenType.Div:
      return { op: '/', precedence: 5, rightAssoc: false, tokenCount: 1 };
    case TokenType.Mod:
      return { op: '%', precedence: 5, rightAssoc: false, tokenCount: 1 };
    case TokenType.Eq:
      return { op: '==', precedence: 3, rightAssoc: false, tokenCount: 1 };
    case TokenType.Neq:
      return { op: '!=', precedence: 3, rightAssoc: false, tokenCount: 1 };
    case TokenType.Lte:
      return { op: '<=', precedence: 3, rightAssoc: false, tokenCount: 1 };
    case TokenType.Lt:
      return { op: '<', precedence: 3, rightAssoc: false, tokenCount: 1 };
    case TokenType.Gte:
      return { op: '>=', precedence: 3, rightAssoc: false, tokenCount: 1 };
    case TokenType.Gt:
      return { op: '>', precedence: 3, rightAssoc: false, tokenCount: 1 };
    case TokenType.Identifier:
      if (tok.value === 'or') return { op: 'or', precedence: 1, rightAssoc: false, tokenCount: 1 };
      if (tok.value === 'and') return { op: 'and', precedence: 2, rightAssoc: false, tokenCount: 1 };
      if (tok.value === 'unless') return { op: 'unless', precedence: 2, rightAssoc: false, tokenCount: 1 };
      if (tok.value === 'atan2') return { op: 'atan2', precedence: 5, rightAssoc: false, tokenCount: 1 };
      return null;
    default:
      return null;
  }
}

const COMPARISON_OPS = new Set(['==', '!=', '<=', '<', '>=', '>']);
const MATCH_OP_BY_TOKEN: Partial<Record<TokenType, MatchOp>> = {
  [TokenType.Assign]: '=',
  [TokenType.Neq]: '!=',
  [TokenType.EqMatch]: '=~',
  [TokenType.NeqMatch]: '!~',
};

/**
 * Hand-written, error-tolerant recursive-descent / precedence-climbing PromQL parser.
 *
 * Design goal (product-critical, see PRD Part 29 "Partial Query Intelligence"): a query
 * that is merely *incomplete* mid-typing (`rate(`, `sum(`, `metric{`, `metric{label=`)
 * must never be treated the same as a *genuinely malformed* query. When the parser runs
 * out of input at a point where the grammar expects a continuation, it synthesizes a
 * placeholder node, sets `incomplete = true`, and emits **no error diagnostic** for that
 * specific gap — only a real mismatch (wrong token, wrong bracket type, etc.) produces an
 * `error` diagnostic.
 */
export class Parser {
  private readonly tokens: Token[];
  private pos = 0;
  private readonly diagnostics: Diagnostic[] = [];
  private incomplete = false;
  private depth = 0;
  private reportedTooComplex = false;
  private readonly dialect: 'promql' | 'metricsql';

  constructor(source: string, dialect: 'promql' | 'metricsql' = 'promql') {
    this.tokens = tokenize(source.length > 200_000 ? source.slice(0, 200_000) : source);
    this.dialect = dialect;
  }

  static parse(source: string, dialect: 'promql' | 'metricsql' = 'promql'): ParseResult {
    const parser = new Parser(source, dialect);
    return parser.run();
  }

  private run(): ParseResult {
    const ast = this.parseExpr(0);
    // MetricsQL's `keep_metric_names` modifier may trail the whole expression — tolerate
    // it here rather than integrating it into the full grammar (Part 54's documented
    // best-effort-subset stance for this dialect).
    if (this.dialect === 'metricsql' && this.checkIdentifier('keep_metric_names')) {
      this.advance();
    }
    // Trailing garbage after a structurally complete expression.
    let guard = 0;
    while (!this.atEOF() && guard < MAX_TOKENS) {
      guard++;
      const tok = this.current();
      this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Unexpected token '${tok.value || tok.type}' after a complete expression.`, tok);
      this.advance();
    }
    return { ast, diagnostics: this.diagnostics, incomplete: this.incomplete };
  }

  // ---- token stream helpers ----------------------------------------------------------

  private current(): Token {
    return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1]!;
  }

  private peek(offset: number): Token {
    return this.tokens[this.pos + offset] ?? this.tokens[this.tokens.length - 1]!;
  }

  private atEOF(): boolean {
    return this.current().type === TokenType.EOF;
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private checkIdentifier(value: string): boolean {
    return this.current().type === TokenType.Identifier && this.current().value === value;
  }

  private advance(): Token {
    const tok = this.current();
    if (this.pos < this.tokens.length - 1) this.pos++;
    return tok;
  }

  private addDiagnostic(severity: Diagnostic['severity'], code: string, message: string, at: Span & { line?: number; column?: number }, suggestion?: string): void {
    const tok = at as Token;
    this.diagnostics.push({
      severity,
      code,
      message,
      start: at.start,
      end: Math.max(at.end, at.start + 1),
      line: tok.line ?? 1,
      column: tok.column ?? 1,
      ...(suggestion ? { suggestion } : {}),
    });
  }

  /** Consumes `type` if present. If absent because we hit EOF, marks the parse
   * incomplete and returns false *without* emitting an error diagnostic. If absent
   * because a different, unexpected token is present, emits a real error diagnostic. */
  private expectClose(type: TokenType, openTok: Token, label: string): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    if (this.atEOF()) {
      this.incomplete = true;
      return false;
    }
    this.addDiagnostic(
      'error',
      DiagnosticCode.UnclosedBracket,
      `Expected closing '${label}' to match '${openTok.value}' opened at position ${openTok.start}.`,
      this.current(),
    );
    return false;
  }

  // ---- entry points --------------------------------------------------------------------

  private parseExpr(minPrec: number): Expr {
    this.depth++;
    if (this.depth > MAX_NESTING_DEPTH) {
      if (!this.reportedTooComplex) {
        this.addDiagnostic('error', DiagnosticCode.TooComplex, 'Query is too deeply nested to parse.', this.current());
        this.reportedTooComplex = true;
      }
      this.depth--;
      return this.synthetic();
    }
    let left = this.parseUnary();
    for (;;) {
      const opInfo = getBinaryOpInfo(this.current());
      if (!opInfo || opInfo.precedence < minPrec) break;
      const opTok = this.advance();

      let boolModifier = false;
      if (COMPARISON_OPS.has(opInfo.op) && this.checkIdentifier('bool')) {
        this.advance();
        boolModifier = true;
      }

      const matching = this.parseVectorMatchingOpt();

      const nextMinPrec = opInfo.rightAssoc ? opInfo.precedence : opInfo.precedence + 1;
      const rhsStartPos = this.pos;
      const rhs = this.atEOF() ? null : this.parseExpr(nextMinPrec);
      if (rhs === null) this.incomplete = true;
      void rhsStartPos;

      const expr: BinaryExpr = {
        type: 'BinaryExpr',
        op: opInfo.op,
        opSpan: { start: opTok.start, end: opTok.end },
        lhs: left,
        rhs,
        boolModifier,
        matching,
        start: left.start,
        end: rhs ? rhs.end : opTok.end,
      };
      left = expr;
    }
    this.depth--;
    return left;
  }

  private synthetic(): SyntheticExpr {
    const tok = this.current();
    return { type: 'SyntheticExpr', start: tok.start, end: tok.start };
  }

  private parseUnary(): Expr {
    if (this.check(TokenType.Add) || this.check(TokenType.Sub)) {
      const opTok = this.advance();
      const inner = this.atEOF() ? null : this.parseUnary();
      if (inner === null) this.incomplete = true;
      const node: UnaryExpr = {
        type: 'UnaryExpr',
        op: opTok.type === TokenType.Add ? '+' : '-',
        expr: inner,
        start: opTok.start,
        end: inner ? inner.end : opTok.end,
      };
      return node;
    }
    return this.parsePow();
  }

  private parsePow(): Expr {
    let left = this.parsePrimaryWithPostfix();
    if (this.check(TokenType.Pow)) {
      const opTok = this.advance();
      const right = this.atEOF() ? null : this.parseUnary();
      if (right === null) this.incomplete = true;
      const node: BinaryExpr = {
        type: 'BinaryExpr',
        op: '^',
        opSpan: { start: opTok.start, end: opTok.end },
        lhs: left,
        rhs: right,
        boolModifier: false,
        matching: null,
        start: left.start,
        end: right ? right.end : opTok.end,
      };
      left = node;
    }
    return left;
  }

  // ---- primary + postfix (label matchers / range / subquery / offset / @) --------------

  private parsePrimaryWithPostfix(): Expr {
    let expr = this.parsePrimary();
    expr = this.parseBracketPostfix(expr);
    expr = this.parseModifiers(expr);
    return expr;
  }

  private parsePrimary(): Expr {
    const tok = this.current();

    switch (tok.type) {
      case TokenType.Number: {
        this.advance();
        const value = Number(tok.value);
        const node: NumberLiteral = { type: 'NumberLiteral', value: Number.isNaN(value) ? 0 : value, text: tok.value, start: tok.start, end: tok.end };
        return node;
      }
      case TokenType.String: {
        this.advance();
        const node: StringLiteral = { type: 'StringLiteral', value: tok.value, start: tok.start, end: tok.end };
        return node;
      }
      case TokenType.LParen: {
        this.advance();
        const inner = this.atEOF() ? null : this.parseExpr(0);
        if (inner === null) this.incomplete = true;
        const closed = this.expectClose(TokenType.RParen, tok, ')');
        const node: ParenExpr = { type: 'ParenExpr', expr: inner, closed, start: tok.start, end: this.pos > 0 ? this.tokens[this.pos - 1]!.end : tok.end };
        return node;
      }
      case TokenType.LBrace: {
        return this.parseVectorSelector(null);
      }
      case TokenType.Identifier: {
        if (AGGREGATION_OPS.has(tok.value)) {
          return this.parseAggregateExpr();
        }
        if (tok.value === 'by' || tok.value === 'without' || tok.value === 'on' || tok.value === 'ignoring' || tok.value === 'group_left' || tok.value === 'group_right' || tok.value === 'offset' || tok.value === 'bool' || tok.value === 'and' || tok.value === 'or' || tok.value === 'unless' || tok.value === 'atan2') {
          this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Unexpected keyword '${tok.value}'.`, tok);
          this.advance();
          return this.synthetic();
        }
        this.advance();
        if (this.check(TokenType.LParen)) {
          return this.parseCall(tok);
        }
        return this.parseVectorSelector(tok.value);
      }
      case TokenType.EOF: {
        this.incomplete = true;
        return this.synthetic();
      }
      case TokenType.RParen:
      case TokenType.RBrace:
      case TokenType.RBracket:
      case TokenType.Comma:
        // Don't consume: an enclosing construct is waiting for exactly this token.
        return this.synthetic();
      case TokenType.LBracket: {
        // A range/subquery suffix with nothing in front of it — typically `rate([5m])`.
        this.addDiagnostic(
          'error',
          DiagnosticCode.UnexpectedToken,
          `A range like '[5m]' must follow a metric selector or expression.`,
          tok,
          `Write the selector first, e.g. 'metric_name[5m]'.`,
        );
        this.advance();
        return this.synthetic();
      }
      default: {
        this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Unexpected token '${tok.value || tok.type}'.`, tok);
        this.advance();
        return this.synthetic();
      }
    }
  }

  private parseCall(nameTok: Token): Call {
    const openTok = this.current(); // '('
    this.advance();
    const args: Expr[] = [];
    let openParen = true;
    let trailingComma = false;
    if (!this.check(TokenType.RParen) && !this.atEOF()) {
      for (;;) {
        args.push(this.parseExpr(0));
        if (this.check(TokenType.Comma)) {
          this.advance();
          if (this.check(TokenType.RParen)) {
            trailingComma = true; // tolerated while typing: `f(a, |)`
            break;
          }
          continue;
        }
        break;
      }
    }
    const closed = this.expectClose(TokenType.RParen, openTok, ')');
    openParen = !closed;
    const end = closed ? this.tokens[this.pos - 1]!.end : this.current().end;
    return {
      type: 'Call',
      funcName: nameTok.value,
      funcNameSpan: { start: nameTok.start, end: nameTok.end },
      args,
      openParen,
      emptyArgSlot: args.length === 0 || trailingComma || args.some(isSynthetic),
      start: nameTok.start,
      end,
    };
  }

  private parseAggregateExpr(): AggregateExpr {
    const opTok = this.advance();
    let grouping: AggregateExpr['grouping'] = null;
    if (this.checkIdentifier('by') || this.checkIdentifier('without')) {
      grouping = this.parseGrouping();
    }

    let openParen = false;
    const args: Expr[] = [];
    let closeEnd = opTok.end;
    let hasArgList = false;
    let trailingComma = false;
    if (this.check(TokenType.LParen)) {
      const openTok = this.advance();
      openParen = true;
      hasArgList = true;
      if (!this.check(TokenType.RParen) && !this.atEOF()) {
        for (;;) {
          args.push(this.parseExpr(0));
          if (this.check(TokenType.Comma)) {
            this.advance();
            if (this.check(TokenType.RParen)) {
              trailingComma = true;
              break;
            }
            continue;
          }
          break;
        }
      }
      const closed = this.expectClose(TokenType.RParen, openTok, ')');
      openParen = !closed;
      closeEnd = closed ? this.tokens[this.pos - 1]!.end : this.current().end;
    } else if (this.atEOF()) {
      this.incomplete = true;
    } else {
      this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Expected '(' after aggregation operator '${opTok.value}'.`, this.current());
    }

    if (!grouping && (this.checkIdentifier('by') || this.checkIdentifier('without'))) {
      grouping = this.parseGrouping();
      closeEnd = grouping.span.end;
    }

    const isParamFirst = ['topk', 'bottomk', 'quantile', 'limitk', 'limit_ratio', 'count_values'].includes(opTok.value);
    let param: Expr | null = null;
    let expr: Expr | null = null;
    if (isParamFirst) {
      param = args[0] ?? null;
      expr = args[1] ?? null;
    } else {
      expr = args[0] ?? null;
    }

    return {
      type: 'AggregateExpr',
      op: opTok.value,
      opSpan: { start: opTok.start, end: opTok.end },
      expr,
      param,
      grouping,
      openParen,
      ...(hasArgList ? { argCount: args.filter((a) => !isSynthetic(a)).length, emptyArgSlot: args.length === 0 || trailingComma || args.some(isSynthetic) } : {}),
      start: opTok.start,
      end: closeEnd,
    };
  }

  private parseGrouping(): NonNullable<AggregateExpr['grouping']> {
    const kwTok = this.advance();
    const mode = kwTok.value as 'by' | 'without';
    const { labels, end } = this.parseLabelNameList();
    let finalEnd = end;
    // A second by/without immediately following is a conflicting-modifiers error, not a
    // fresh grouping — consume and discard it so parsing can continue past the mistake.
    while (this.checkIdentifier('by') || this.checkIdentifier('without')) {
      const dupTok = this.current();
      this.addDiagnostic(
        'error',
        DiagnosticCode.ConflictingModifiers,
        `An aggregation can only have one 'by' or 'without' clause, not both.`,
        dupTok,
      );
      const discarded = this.parseGroupingRaw();
      finalEnd = discarded.span.end;
    }
    return { mode, labels, span: { start: kwTok.start, end: finalEnd } };
  }

  private parseGroupingRaw(): NonNullable<AggregateExpr['grouping']> {
    const kwTok = this.advance();
    const mode = kwTok.value as 'by' | 'without';
    const { labels, end } = this.parseLabelNameList();
    return { mode, labels, span: { start: kwTok.start, end } };
  }

  private parseLabelNameList(): { labels: string[]; end: number } {
    const labels: string[] = [];
    if (!this.check(TokenType.LParen)) {
      if (this.atEOF()) {
        this.incomplete = true;
        return { labels, end: this.current().end };
      }
      this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Expected '(' to start a label list.`, this.current());
      return { labels, end: this.current().end };
    }
    const openTok = this.advance();
    if (!this.check(TokenType.RParen) && !this.atEOF()) {
      for (;;) {
        if (this.check(TokenType.Identifier)) {
          labels.push(this.advance().value);
        } else if (this.atEOF()) {
          this.incomplete = true;
          break;
        } else if (this.check(TokenType.RParen)) {
          break;
        } else {
          this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Expected a label name.`, this.current());
          this.advance();
        }
        if (this.check(TokenType.Comma)) {
          this.advance();
          continue;
        }
        break;
      }
    }
    const closed = this.expectClose(TokenType.RParen, openTok, ')');
    const end = closed ? this.tokens[this.pos - 1]!.end : this.current().end;
    return { labels, end };
  }

  private parseVectorSelector(name: string | null): VectorSelector {
    const nameTok = this.tokens[this.pos - 1];
    const start = name !== null && nameTok ? nameTok.start : this.current().start;
    let labelMatchers: LabelMatcher[] = [];
    let openLabelBrace = false;
    let end = name !== null && nameTok ? nameTok.end : start;

    if (this.check(TokenType.LBrace)) {
      const result = this.parseLabelMatchers();
      labelMatchers = result.matchers;
      openLabelBrace = result.open;
      end = result.end;
    }

    return {
      type: 'VectorSelector',
      name,
      labelMatchers,
      offset: null,
      at: null,
      openLabelBrace,
      start,
      end,
    };
  }

  private parseLabelMatchers(): { matchers: LabelMatcher[]; open: boolean; end: number } {
    const openTok = this.advance(); // '{'
    const matchers: LabelMatcher[] = [];
    const seen = new Map<string, number>();

    if (!this.check(TokenType.RBrace) && !this.atEOF()) {
      let guard = 0;
      for (;;) {
        guard++;
        if (guard > MAX_TOKENS) break;
        if (this.atEOF() || this.check(TokenType.RBrace)) break;

        if (!this.check(TokenType.Identifier)) {
          this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Expected a label name.`, this.current());
          this.advance();
          if (this.check(TokenType.Comma)) {
            this.advance();
            continue;
          }
          break;
        }
        const nameTok = this.advance();
        const matchOp = MATCH_OP_BY_TOKEN[this.current().type];
        let opTok: Token | null = null;
        if (matchOp) {
          opTok = this.advance();
        } else if (!this.atEOF()) {
          this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Expected a label match operator ('=', '!=', '=~', or '!~').`, this.current());
        } else {
          this.incomplete = true;
        }

        let value = '';
        let valueEnd = opTok ? opTok.end : nameTok.end;
        let synthetic = false;
        if (this.check(TokenType.String)) {
          const valTok = this.advance();
          value = valTok.value;
          valueEnd = valTok.end;
        } else if (this.atEOF()) {
          this.incomplete = true;
          synthetic = true;
        } else if (matchOp) {
          this.addDiagnostic('error', DiagnosticCode.MissingLabelValue, `Expected a quoted string value for label '${nameTok.value}'.`, this.current());
          synthetic = true;
        }

        if (seen.has(nameTok.value)) {
          this.addDiagnostic('warning', DiagnosticCode.DuplicateLabelMatcher, `Duplicate label matcher for '${nameTok.value}'.`, nameTok);
        }
        seen.set(nameTok.value, 1);

        matchers.push({
          type: 'LabelMatcher',
          name: nameTok.value,
          op: matchOp ?? '=',
          value,
          synthetic,
          start: nameTok.start,
          end: valueEnd,
        });

        if (this.check(TokenType.Comma)) {
          this.advance();
          if (this.check(TokenType.RBrace)) break; // trailing comma tolerated
          continue;
        }
        break;
      }
    }

    const closed = this.expectClose(TokenType.RBrace, openTok, '}');
    const end = closed ? this.tokens[this.pos - 1]!.end : this.current().end;
    return { matchers, open: !closed, end };
  }

  /** Wraps a completed expression in a MatrixSelector/SubqueryExpr if `[` follows. */
  private parseBracketPostfix(expr: Expr): Expr {
    if (!this.check(TokenType.LBracket)) return expr;
    const openTok = this.advance();
    // `metric[]` is what auto-closed brackets leave mid-typing (`metric[` + `]`): an unfilled
    // slot, reported as incomplete rather than as a missing-duration error.
    const emptyRange = this.check(TokenType.RBracket);
    if (emptyRange) this.incomplete = true;
    const range = emptyRange ? null : this.parseDurationValue();
    let step: Duration | null = null;
    let isSubquery = false;
    if (this.check(TokenType.Colon)) {
      isSubquery = true;
      this.advance();
      if (!this.check(TokenType.RBracket) && !this.atEOF()) {
        step = this.parseDurationValue();
      }
    }
    const closed = this.expectClose(TokenType.RBracket, openTok, ']');
    const end = closed ? this.tokens[this.pos - 1]!.end : this.current().end;

    if (!isSubquery && expr.type === 'VectorSelector') {
      const node: MatrixSelector = { type: 'MatrixSelector', vector: expr, range, offset: null, at: null, start: expr.start, end };
      return node;
    }
    const node: SubqueryExpr = { type: 'SubqueryExpr', expr, range, step, offset: null, at: null, start: expr.start, end };
    return node;
  }

  private parseDurationValue(): Duration | null {
    if (this.check(TokenType.Duration)) {
      const tok = this.advance();
      return { type: 'Duration', text: tok.value, milliseconds: parseDurationText(tok.value), start: tok.start, end: tok.end };
    }
    if (this.check(TokenType.Number)) {
      const tok = this.advance();
      this.addDiagnostic('error', DiagnosticCode.InvalidDuration, `Duration is missing a unit (e.g. 's', 'm', 'h'). Got '${tok.value}'.`, tok);
      return { type: 'Duration', text: tok.value, milliseconds: null, start: tok.start, end: tok.end };
    }
    if (this.atEOF()) {
      this.incomplete = true;
      return null;
    }
    this.addDiagnostic('error', DiagnosticCode.InvalidDuration, `Expected a duration (e.g. '5m', '1h').`, this.current());
    return null;
  }

  /** Attaches trailing `offset` / `@` modifiers to a selector-like node. */
  private parseModifiers<T extends VectorSelector | MatrixSelector | SubqueryExpr>(expr: T | Expr): Expr {
    if (expr.type !== 'VectorSelector' && expr.type !== 'MatrixSelector' && expr.type !== 'SubqueryExpr') return expr;
    let node = expr;
    let iterations = 0;
    for (;;) {
      iterations++;
      if (iterations > 4) break;
      if (this.checkIdentifier('offset')) {
        const kwTok = this.advance();
        let negative = false;
        if (this.check(TokenType.Sub)) {
          this.advance();
          negative = true;
        }
        const duration = this.parseDurationValue();
        const offset: OffsetModifier = { type: 'OffsetModifier', duration, negative, start: kwTok.start, end: duration ? duration.end : kwTok.end };
        node = { ...node, offset, end: offset.end };
        continue;
      }
      if (this.check(TokenType.At)) {
        const atTok = this.advance();
        let value: number | 'start' | 'end' = 0;
        let end = atTok.end;
        if (this.check(TokenType.Number)) {
          const numTok = this.advance();
          value = Number(numTok.value);
          end = numTok.end;
        } else if (this.checkIdentifier('start') || this.checkIdentifier('end')) {
          const kwTok = this.advance();
          value = kwTok.value as 'start' | 'end';
          end = kwTok.end;
        } else if (this.atEOF()) {
          this.incomplete = true;
        } else {
          this.addDiagnostic('error', DiagnosticCode.UnexpectedToken, `Expected a unix timestamp, 'start', or 'end' after '@'.`, this.current());
        }
        const at: AtModifier = { type: 'AtModifier', value, start: atTok.start, end };
        node = { ...node, at, end: at.end };
        continue;
      }
      break;
    }
    return node;
  }

  private parseVectorMatchingOpt(): VectorMatching | null {
    if (this.checkIdentifier('on') || this.checkIdentifier('ignoring')) {
      const kwTok = this.advance();
      const mode = kwTok.value as 'on' | 'ignoring';
      const { labels, end } = this.parseLabelNameList();
      let card: 'group_left' | 'group_right' | null = null;
      let includeLabels: string[] = [];
      let finalEnd = end;
      if (this.checkIdentifier('group_left') || this.checkIdentifier('group_right')) {
        const cardTok = this.advance();
        card = cardTok.value as 'group_left' | 'group_right';
        finalEnd = cardTok.end;
        if (this.check(TokenType.LParen)) {
          const inc = this.parseLabelNameList();
          includeLabels = inc.labels;
          finalEnd = inc.end;
        }
      }
      return { mode, labels, card, includeLabels, start: kwTok.start, end: finalEnd };
    }
    if (this.checkIdentifier('group_left') || this.checkIdentifier('group_right')) {
      const cardTok = this.advance();
      const card = cardTok.value as 'group_left' | 'group_right';
      let includeLabels: string[] = [];
      let end = cardTok.end;
      if (this.check(TokenType.LParen)) {
        const inc = this.parseLabelNameList();
        includeLabels = inc.labels;
        end = inc.end;
      }
      return { mode: 'on', labels: [], card, includeLabels, start: cardTok.start, end };
    }
    return null;
  }
}

export function parsePromQL(source: string, dialect: 'promql' | 'metricsql' = 'promql'): ParseResult {
  return Parser.parse(source, dialect);
}
