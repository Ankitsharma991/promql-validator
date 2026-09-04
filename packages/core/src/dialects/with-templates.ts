import { tokenize } from '../lexer/tokenizer.js';
import { Token, TokenType } from '../lexer/token.js';
import { Diagnostic, DiagnosticCode } from '../validator/diagnostics.js';

export interface WithExpansionResult {
  /** The query with every `WITH (...)` template reference substituted in, ready for the
   * normal parser. Equal to the input when no `WITH` block was present. */
  expanded: string;
  diagnostics: Diagnostic[];
  hadWith: boolean;
}

interface TemplateValue {
  /** Parenthesized form, for substitution at a general expression position — protects
   * operator precedence (`WITH (x = a+b) x*c` must become `(a+b)*c`, not `a+b*c`). */
  wrapped: string;
  /** Set only when the resolved value is itself a `{...}` filter — lets a reference used as
   * the *sole* content of an enclosing `{...}` (`metric{filterName}`) splice the filter's
   * inner matchers directly, instead of nesting braces-in-parens-in-braces (invalid syntax):
   * MetricsQL's actual filter-template semantics merge into the surrounding selector rather
   * than substituting as a generic sub-expression. */
  braceInner: string | null;
}

function isWithKeyword(tok: Token | undefined): boolean {
  return !!tok && tok.type === TokenType.Identifier && tok.value.toLowerCase() === 'with';
}

const OPENERS = new Set([TokenType.LParen, TokenType.LBrace, TokenType.LBracket]);
const CLOSERS = new Set([TokenType.RParen, TokenType.RBrace, TokenType.RBracket]);

function braceInnerOf(text: string): string | null {
  const t = text.trim();
  return t.startsWith('{') && t.endsWith('}') ? t.slice(1, -1) : null;
}

/** Token-aware substitution: replaces only whole `Identifier` tokens matching a key in
 * `replacements`, leaving everything else (including string-literal contents, which the
 * tokenizer never classifies as Identifier) byte-for-byte untouched. Brace-filter references
 * (see `TemplateValue.braceInner`) are detected via the immediately-neighboring tokens. */
function substituteIdentifiers(text: string, replacements: Map<string, TemplateValue>): string {
  if (replacements.size === 0) return text;
  const tokens = tokenize(text).filter((t) => t.type !== TokenType.EOF);
  let out = '';
  let lastEnd = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    out += text.slice(lastEnd, tok.start);
    const tv = tok.type === TokenType.Identifier ? replacements.get(tok.value) : undefined;
    if (tv) {
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      const isSoleBraceContent = prev?.type === TokenType.LBrace && next?.type === TokenType.RBrace && tv.braceInner !== null;
      out += isSoleBraceContent ? tv.braceInner! : tv.wrapped;
    } else {
      out += text.slice(tok.start, tok.end);
    }
    lastEnd = tok.end;
  }
  out += text.slice(lastEnd);
  return out;
}

/** Splits a WITH header's inner text into `name = expr` pairs at depth-0 commas, reporting
 * a diagnostic (rather than silently dropping) for any segment that isn't a well-formed
 * `name = non-empty-expr` pair. Only the simple, non-parameterized form is supported —
 * MetricsQL's parameterized templates (`name(arg1, arg2) = expr`) are a documented gap (see
 * METRICSQL_FUNCTIONS' module docstring for this file's general best-effort-subset stance). */
function splitHeaderPairs(headerText: string, headerOffset: number): { pairs: { name: string; expr: string }[]; diagnostics: Diagnostic[] } {
  const tokens = tokenize(headerText).filter((t) => t.type !== TokenType.EOF);
  const pairs: { name: string; expr: string }[] = [];
  const diagnostics: Diagnostic[] = [];
  let depth = 0;
  let pairStart = 0;
  let assignPos = -1;

  function flush(end: number) {
    const segment = headerText.slice(pairStart, end);
    if (segment.trim() === '') return; // trailing comma or fully-empty header; not an error
    if (assignPos === -1) {
      diagnostics.push({
        severity: 'error',
        code: DiagnosticCode.UnexpectedToken,
        message: `Malformed WITH template definition (expected 'name = expr'): '${segment.trim()}'.`,
        start: headerOffset + pairStart,
        end: headerOffset + end,
        line: 1,
        column: 1,
      });
      return;
    }
    const name = headerText.slice(pairStart, assignPos).trim();
    const expr = headerText.slice(assignPos + 1, end).trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) || expr.length === 0) {
      diagnostics.push({
        severity: 'error',
        code: DiagnosticCode.UnexpectedToken,
        message: `Malformed WITH template definition (expected 'name = expr'): '${segment.trim()}'.`,
        start: headerOffset + pairStart,
        end: headerOffset + end,
        line: 1,
        column: 1,
      });
      return;
    }
    pairs.push({ name, expr });
  }

  for (const tok of tokens) {
    if (OPENERS.has(tok.type)) depth++;
    else if (CLOSERS.has(tok.type)) depth--;
    else if (tok.type === TokenType.Assign && depth === 0 && assignPos === -1) {
      assignPos = tok.start;
    } else if (tok.type === TokenType.Comma && depth === 0) {
      flush(tok.start);
      pairStart = tok.end;
      assignPos = -1;
    }
  }
  flush(headerText.length);
  return { pairs, diagnostics };
}

/**
 * Expands a leading `WITH (name1 = expr1, name2 = expr2, ...) body` block (MetricsQL's
 * reusable-sub-expression syntax) into plain PromQL-compatible text the normal parser can
 * consume — implemented as textual, token-aware macro substitution (not deep AST-level
 * templating), which covers the common, documented case: naming a filter or sub-expression
 * once and reusing it by name in the body (and in later template definitions).
 */
export function expandWithTemplates(source: string): WithExpansionResult {
  const tokens = tokenize(source);
  const first = tokens[0];
  if (!isWithKeyword(first)) {
    return { expanded: source, diagnostics: [], hadWith: false };
  }
  if (tokens[1]?.type !== TokenType.LParen) {
    return {
      expanded: source,
      hadWith: true,
      diagnostics: [{ severity: 'error', code: DiagnosticCode.UnexpectedToken, message: "Expected '(' after 'WITH'.", start: first!.end, end: first!.end + 1, line: first!.line, column: first!.column }],
    };
  }

  let depth = 0;
  let closeIdx = -1;
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type === TokenType.LParen) depth++;
    else if (t.type === TokenType.RParen) {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) {
    const last = tokens[tokens.length - 1]!;
    return {
      expanded: source,
      hadWith: true,
      diagnostics: [{ severity: 'error', code: DiagnosticCode.UnclosedBracket, message: "Expected closing ')' for the WITH header.", start: last.start, end: last.end, line: last.line, column: last.column }],
    };
  }

  const headerOpenTok = tokens[1]!;
  const headerCloseTok = tokens[closeIdx]!;
  const headerText = source.slice(headerOpenTok.end, headerCloseTok.start);
  const bodyText = source.slice(headerCloseTok.end);

  const { pairs, diagnostics } = splitHeaderPairs(headerText, headerOpenTok.end);
  if (diagnostics.length > 0) {
    return { expanded: source, hadWith: true, diagnostics };
  }

  const resolved = new Map<string, TemplateValue>();
  for (const { name, expr } of pairs) {
    const substituted = substituteIdentifiers(expr, resolved);
    resolved.set(name, { wrapped: `(${substituted})`, braceInner: braceInnerOf(substituted) });
  }

  const expandedBody = substituteIdentifiers(bodyText, resolved);
  return { expanded: expandedBody, diagnostics: [], hadWith: true };
}
