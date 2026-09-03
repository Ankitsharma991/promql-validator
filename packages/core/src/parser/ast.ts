import { Span } from '../lexer/token.js';

export type MatchOp = '=' | '!=' | '=~' | '!~';

export interface LabelMatcher extends Span {
  type: 'LabelMatcher';
  name: string;
  op: MatchOp;
  value: string;
  /** true when the value literal was never closed (e.g. `service="a`) */
  synthetic?: boolean;
}

export interface Duration extends Span {
  type: 'Duration';
  text: string;
  /** milliseconds, or null when the text couldn't be parsed (still kept for diagnostics/formatting) */
  milliseconds: number | null;
}

export interface AtModifier extends Span {
  type: 'AtModifier';
  /** unix timestamp in seconds, or the literal 'start'/'end' for Prometheus 2.33+ */
  value: number | 'start' | 'end';
}

export interface OffsetModifier extends Span {
  type: 'OffsetModifier';
  duration: Duration | null;
  negative: boolean;
}

export interface VectorSelector extends Span {
  type: 'VectorSelector';
  name: string | null;
  labelMatchers: LabelMatcher[];
  offset: OffsetModifier | null;
  at: AtModifier | null;
  /** true while the `{` has not yet been closed (mid-typing) */
  openLabelBrace?: boolean;
}

export interface MatrixSelector extends Span {
  type: 'MatrixSelector';
  vector: VectorSelector;
  range: Duration | null;
  offset: OffsetModifier | null;
  at: AtModifier | null;
}

export interface SubqueryExpr extends Span {
  type: 'SubqueryExpr';
  expr: Expr;
  range: Duration | null;
  step: Duration | null;
  offset: OffsetModifier | null;
  at: AtModifier | null;
}

export interface NumberLiteral extends Span {
  type: 'NumberLiteral';
  value: number;
  text: string;
}

export interface StringLiteral extends Span {
  type: 'StringLiteral';
  value: string;
}

export interface Call extends Span {
  type: 'Call';
  funcName: string;
  funcNameSpan: Span;
  args: Expr[];
  /** true while the `(` has not yet been closed (mid-typing) */
  openParen?: boolean;
}

export type GroupingMode = 'by' | 'without';

export interface AggregateExpr extends Span {
  type: 'AggregateExpr';
  op: string;
  opSpan: Span;
  expr: Expr | null;
  param: Expr | null; // e.g. the k in topk(k, ...) or the quantile in quantile(q, ...)
  grouping: { mode: GroupingMode; labels: string[]; span: Span } | null;
  openParen?: boolean;
}

export interface VectorMatching extends Span {
  mode: 'on' | 'ignoring';
  labels: string[];
  card: 'group_left' | 'group_right' | null;
  includeLabels: string[];
}

export interface BinaryExpr extends Span {
  type: 'BinaryExpr';
  op: string;
  opSpan: Span;
  lhs: Expr;
  rhs: Expr | null;
  boolModifier: boolean;
  matching: VectorMatching | null;
}

export interface UnaryExpr extends Span {
  type: 'UnaryExpr';
  op: '+' | '-';
  expr: Expr | null;
}

export interface ParenExpr extends Span {
  type: 'ParenExpr';
  expr: Expr | null;
  closed: boolean;
}

/** Placeholder inserted where the grammar required an expression but input ran out.
 * Marks the point where autocomplete should still offer suggestions mid-typing. */
export interface SyntheticExpr extends Span {
  type: 'SyntheticExpr';
}

export type Expr =
  | VectorSelector
  | MatrixSelector
  | SubqueryExpr
  | NumberLiteral
  | StringLiteral
  | Call
  | AggregateExpr
  | BinaryExpr
  | UnaryExpr
  | ParenExpr
  | SyntheticExpr;

export type AstNode = Expr | LabelMatcher | Duration | AtModifier | OffsetModifier;

export function isSynthetic(node: Expr | null | undefined): boolean {
  return !!node && (node.type === 'SyntheticExpr' || (node as { synthetic?: boolean }).synthetic === true);
}
