export enum TokenType {
  Number = 'Number',
  String = 'String',
  Duration = 'Duration',
  Identifier = 'Identifier',

  LParen = '(',
  RParen = ')',
  LBrace = '{',
  RBrace = '}',
  LBracket = '[',
  RBracket = ']',
  Comma = ',',
  Colon = ':',
  At = '@',

  Add = '+',
  Sub = '-',
  Mul = '*',
  Div = '/',
  Mod = '%',
  Pow = '^',

  Assign = '=',
  Eq = '==',
  Neq = '!=',
  Lt = '<',
  Lte = '<=',
  Gt = '>',
  Gte = '>=',
  EqMatch = '=~',
  NeqMatch = '!~',

  EOF = 'EOF',
  Illegal = 'Illegal',
}

/** Half-open character offset range: [start, end) in the original source text. */
export interface Span {
  start: number;
  end: number;
}

export interface Token extends Span {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  /** Set on a String token whose closing quote is missing (input ended inside it). */
  unterminated?: boolean;
}

/** PromQL keywords that are only significant in specific grammatical positions;
 * the lexer emits them as plain Identifier tokens and the parser interprets them
 * contextually (this mirrors how Prometheus's own lexer treats most of these). */
export const KEYWORDS = new Set([
  'by',
  'without',
  'on',
  'ignoring',
  'group_left',
  'group_right',
  'offset',
  'bool',
  'and',
  'or',
  'unless',
  'atan2',
]);

export const AGGREGATION_OPS = new Set([
  'sum',
  'avg',
  'min',
  'max',
  'count',
  'count_values',
  'stddev',
  'stdvar',
  'topk',
  'bottomk',
  'quantile',
  'group',
  'limitk',
  'limit_ratio',
]);
