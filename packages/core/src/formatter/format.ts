import { Expr, isSynthetic } from '../parser/ast.js';
import { parsePromQL } from '../parser/parser.js';

export interface FormatOptions {
  indentSize?: number;
  indentStyle?: 'space' | 'tab';
  maxInlineWidth?: number;
}

const DEFAULTS: Required<FormatOptions> = {
  indentSize: 2,
  indentStyle: 'space',
  maxInlineWidth: 80,
};

export class PromQLFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromQLFormatError';
  }
}

function renderMatcherValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function renderLabelList(labels: string[]): string {
  return `(${labels.join(', ')})`;
}

function renderModifiers(node: { offset: { negative: boolean; duration: { text: string } | null } | null; at: { value: number | 'start' | 'end' } | null }): string {
  let out = '';
  if (node.offset) {
    out += ` offset ${node.offset.negative ? '-' : ''}${node.offset.duration?.text ?? ''}`;
  }
  if (node.at) {
    out += ` @ ${node.at.value}`;
  }
  return out;
}

function renderVectorMatching(m: { mode: 'on' | 'ignoring'; labels: string[]; card: 'group_left' | 'group_right' | null; includeLabels: string[] } | null): string {
  if (!m) return '';
  let out = ` ${m.mode} ${renderLabelList(m.labels)}`;
  if (m.card) {
    out += ` ${m.card}`;
    if (m.includeLabels.length > 0) out += ` ${renderLabelList(m.includeLabels)}`;
  }
  return out;
}

function render(node: Expr): string {
  if (isSynthetic(node)) return '';

  switch (node.type) {
    case 'NumberLiteral':
      return node.text;
    case 'StringLiteral':
      return renderMatcherValue(node.value);
    case 'VectorSelector': {
      const matchers = node.labelMatchers.map((m) => `${m.name}${m.op}${renderMatcherValue(m.value)}`).join(', ');
      const braces = node.labelMatchers.length > 0 ? `{${matchers}}` : '';
      return `${node.name ?? ''}${braces}${renderModifiers(node)}`;
    }
    case 'MatrixSelector': {
      const matchers = node.vector.labelMatchers.map((m) => `${m.name}${m.op}${renderMatcherValue(m.value)}`).join(', ');
      const braces = node.vector.labelMatchers.length > 0 ? `{${matchers}}` : '';
      return `${node.vector.name ?? ''}${braces}[${node.range?.text ?? ''}]${renderModifiers(node)}`;
    }
    case 'SubqueryExpr': {
      const step = node.step ? node.step.text : '';
      return `${render(node.expr)}[${node.range?.text ?? ''}:${step}]${renderModifiers(node)}`;
    }
    case 'Call': {
      const args = node.args.map(render).join(', ');
      return `${node.funcName}(${args})`;
    }
    case 'AggregateExpr': {
      const groupingText = node.grouping ? ` ${node.grouping.mode} ${renderLabelList(node.grouping.labels)}` : '';
      const parts = [node.param, node.expr].filter((e): e is Expr => e !== null && !isSynthetic(e));
      const args = parts.map(render).join(', ');
      return `${node.op}${groupingText} (${args})`;
    }
    case 'BinaryExpr': {
      const boolText = node.boolModifier ? ' bool' : '';
      const matchingText = renderVectorMatching(node.matching);
      const rhs = node.rhs ? render(node.rhs) : '';
      return `${render(node.lhs)} ${node.op}${boolText}${matchingText} ${rhs}`;
    }
    case 'UnaryExpr':
      return `${node.op}${node.expr ? render(node.expr) : ''}`;
    case 'ParenExpr':
      return `(${node.expr ? render(node.expr) : ''})`;
    case 'SyntheticExpr':
      return '';
    default:
      return '';
  }
}

function renderWithLineBreaks(node: Expr, opts: Required<FormatOptions>): string {
  const inline = render(node);
  if (inline.length <= opts.maxInlineWidth) return inline;

  const indentUnit = opts.indentStyle === 'tab' ? '\t' : ' '.repeat(opts.indentSize);

  if (node.type === 'AggregateExpr') {
    const groupingText = node.grouping ? ` ${node.grouping.mode} ${renderLabelList(node.grouping.labels)}` : '';
    const parts = [node.param, node.expr].filter((e): e is Expr => e !== null && !isSynthetic(e));
    if (parts.length > 0) {
      const inner = parts.map((p) => render(p)).join(', ');
      return `${node.op}${groupingText} (\n${indentUnit}${inner}\n)`;
    }
  }

  if (node.type === 'Call' && node.args.length > 0) {
    const inner = node.args.map((a) => render(a)).join(', ');
    return `${node.funcName}(\n${indentUnit}${inner}\n)`;
  }

  return inline;
}

/**
 * Deterministic, semantics-preserving PromQL formatter. Operates purely on the parsed
 * AST and re-serializes it — it never string-manipulates the input, so it cannot change
 * query meaning. Throws `PromQLFormatError` (rather than guessing) if the input has
 * error-level syntax diagnostics.
 */
export function formatPromQL(query: string, options: FormatOptions = {}): string {
  const trimmed = query.trim();
  if (trimmed.length === 0) return query;

  const opts: Required<FormatOptions> = { ...DEFAULTS, ...options };
  const { ast, diagnostics, incomplete } = parsePromQL(query);
  const hasErrors = diagnostics.some((d) => d.severity === 'error');
  if (hasErrors || incomplete) {
    throw new PromQLFormatError('Cannot format a query with syntax errors or an incomplete expression.');
  }

  return renderWithLineBreaks(ast, opts);
}
