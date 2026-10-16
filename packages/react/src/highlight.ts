import { tokenize, TokenType, type Diagnostic, type Token } from '@promql-validator/core';

export type SyntaxKind = 'metric' | 'function' | 'keyword' | 'label' | 'string' | 'number' | 'duration' | 'operator' | 'punctuation' | 'comment' | 'invalid' | 'plain';

export interface HighlightSegment {
  text: string;
  kind: SyntaxKind;
  severity?: Diagnostic['severity'];
}

// Mirrors the lexer's KEYWORDS set (core/lexer/token.ts), which isn't part of the public API.
const KEYWORDS = new Set(['by', 'without', 'on', 'ignoring', 'group_left', 'group_right', 'offset', 'bool', 'and', 'or', 'unless', 'atan2']);
// Keywords whose following parenthesised list contains label names, not expressions.
const LABEL_LIST_KEYWORDS = new Set(['by', 'without', 'on', 'ignoring', 'group_left', 'group_right']);
const NUMERIC_IDENTIFIERS = new Set(['inf', 'nan']);

const OPERATOR_TOKENS = new Set<TokenType>([
  TokenType.Add,
  TokenType.Sub,
  TokenType.Mul,
  TokenType.Div,
  TokenType.Mod,
  TokenType.Pow,
  TokenType.Assign,
  TokenType.Eq,
  TokenType.Neq,
  TokenType.Lt,
  TokenType.Lte,
  TokenType.Gt,
  TokenType.Gte,
  TokenType.EqMatch,
  TokenType.NeqMatch,
  TokenType.At,
]);

interface ClassifiedSpan {
  start: number;
  end: number;
  kind: SyntaxKind;
}

/**
 * Token-level (not AST-level) classification: it must stay cheap enough to run on every
 * keystroke and must never fail on half-typed input, so it only looks at immediate
 * neighbours plus a small bracket stack to tell label names apart from metric names.
 */
function classifyTokens(tokens: Token[]): ClassifiedSpan[] {
  const out: ClassifiedSpan[] = [];
  // Each open bracket records whether identifiers directly inside it are label names.
  const stack: boolean[] = [];
  let pendingLabelList = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type === TokenType.EOF) break;
    const next = tokens[i + 1];
    let kind: SyntaxKind;

    switch (t.type) {
      case TokenType.Identifier: {
        const lower = t.value.toLowerCase();
        const inLabelContext = stack.length > 0 && stack[stack.length - 1]!;
        if (inLabelContext) kind = 'label';
        else if (KEYWORDS.has(lower)) kind = 'keyword';
        else if (NUMERIC_IDENTIFIERS.has(lower)) kind = 'number';
        else if (next?.type === TokenType.LParen) kind = 'function';
        else kind = 'metric';
        pendingLabelList = !inLabelContext && LABEL_LIST_KEYWORDS.has(lower);
        break;
      }
      case TokenType.LBrace:
        stack.push(true);
        kind = 'punctuation';
        pendingLabelList = false;
        break;
      case TokenType.LParen:
        stack.push(pendingLabelList);
        kind = 'punctuation';
        pendingLabelList = false;
        break;
      case TokenType.LBracket:
        stack.push(false);
        kind = 'punctuation';
        pendingLabelList = false;
        break;
      case TokenType.RBrace:
      case TokenType.RParen:
      case TokenType.RBracket:
        stack.pop();
        kind = 'punctuation';
        break;
      case TokenType.Comma:
      case TokenType.Colon:
        kind = 'punctuation';
        break;
      case TokenType.String:
        kind = 'string';
        break;
      case TokenType.Number:
        kind = 'number';
        break;
      case TokenType.Duration:
        kind = 'duration';
        break;
      case TokenType.Illegal:
        kind = 'invalid';
        break;
      default:
        kind = OPERATOR_TOKENS.has(t.type) ? 'operator' : 'plain';
    }
    if (t.type !== TokenType.Identifier && t.type !== TokenType.LParen) pendingLabelList = false;
    out.push({ start: t.start, end: t.end, kind });
  }
  return out;
}

/** Fills the gaps between tokens (whitespace and `#` comments, which the lexer skips). */
function withGaps(value: string, spans: ClassifiedSpan[]): ClassifiedSpan[] {
  const out: ClassifiedSpan[] = [];
  let pos = 0;
  const pushGap = (start: number, end: number) => {
    if (start >= end) return;
    const gap = value.slice(start, end);
    const hash = gap.indexOf('#');
    if (hash === -1) {
      out.push({ start, end, kind: 'plain' });
      return;
    }
    if (hash > 0) out.push({ start, end: start + hash, kind: 'plain' });
    out.push({ start: start + hash, end, kind: 'comment' });
  };
  for (const s of spans) {
    const start = Math.max(s.start, pos);
    const end = Math.min(s.end, value.length);
    if (end <= start) continue;
    pushGap(pos, start);
    out.push({ start, end, kind: s.kind });
    pos = end;
  }
  pushGap(pos, value.length);
  return out;
}

const SEVERITY_RANK: Record<Diagnostic['severity'], number> = { error: 3, warning: 2, info: 1 };

/**
 * Splits `value` into styled segments for the input's highlight overlay. Concatenating every
 * segment's `text` always reproduces `value` exactly, so the overlay lines up glyph-for-glyph
 * with the real (transparent-text) `<input>` underneath.
 */
export function buildHighlightSegments(value: string, diagnostics: readonly Diagnostic[] = []): HighlightSegment[] {
  if (value.length === 0) return [];

  let spans: ClassifiedSpan[];
  try {
    spans = withGaps(value, classifyTokens(tokenize(value)));
  } catch {
    spans = [{ start: 0, end: value.length, kind: 'plain' }];
  }

  // Zero-width diagnostics (e.g. "unexpected end of input") still need a visible mark, so
  // they're widened to the nearest character.
  const ranges = diagnostics
    .map((d) => {
      let start = Math.max(0, Math.min(d.start, value.length));
      let end = Math.max(start, Math.min(d.end, value.length));
      if (end === start) {
        if (start === value.length) start = Math.max(0, start - 1);
        end = Math.min(value.length, start + 1);
      }
      return { start, end, severity: d.severity };
    })
    .filter((r) => r.end > r.start);

  if (ranges.length === 0) return spans.map((s) => ({ text: value.slice(s.start, s.end), kind: s.kind }));

  const cuts = new Set<number>();
  for (const r of ranges) {
    cuts.add(r.start);
    cuts.add(r.end);
  }

  const out: HighlightSegment[] = [];
  for (const s of spans) {
    const points = [s.start, ...[...cuts].filter((c) => c > s.start && c < s.end).sort((a, b) => a - b), s.end];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      let severity: Diagnostic['severity'] | undefined;
      for (const r of ranges) {
        if (r.start < b && r.end > a && (!severity || SEVERITY_RANK[r.severity] > SEVERITY_RANK[severity])) severity = r.severity;
      }
      out.push({ text: value.slice(a, b), kind: s.kind, severity });
    }
  }
  return out;
}

/**
 * Character indices of `label` matched by the typed `needle`: a contiguous case-insensitive
 * substring match when there is one, otherwise a greedy in-order (fuzzy) match. Returns an
 * empty array when the needle doesn't match at all.
 */
export function matchIndices(label: string, needle: string): number[] {
  if (!needle) return [];
  const hay = label.toLowerCase();
  const n = needle.toLowerCase();
  const at = hay.indexOf(n);
  if (at !== -1) return Array.from({ length: n.length }, (_, i) => at + i);
  const out: number[] = [];
  let j = 0;
  for (let i = 0; i < hay.length && j < n.length; i++) {
    if (hay[i] === n[j]) {
      out.push(i);
      j++;
    }
  }
  return j === n.length ? out : [];
}
