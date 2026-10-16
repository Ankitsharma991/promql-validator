import { validatePromQL, type ValidationOptions } from '../validator/validate.js';
import type { ValidationResult } from '../validator/diagnostics.js';

export interface RuleValidationEntry {
  groupName: string;
  ruleType: 'record' | 'alert';
  ruleName: string;
  expr: string;
  /** 1-based line number of the `expr:` key in the source file. */
  line: number;
  result: ValidationResult;
}

export interface RuleFileValidationResult {
  entries: RuleValidationEntry[];
  /** true iff every extracted expr validated successfully. */
  valid: boolean;
}

function leadingSpaces(line: string): number {
  const m = /^ */.exec(line);
  return m ? m[0].length : 0;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed[0] === '"' && trimmed[trimmed.length - 1] === '"') || (trimmed[0] === "'" && trimmed[trimmed.length - 1] === "'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Extracts and validates every rule's `expr:` field from a Prometheus recording/alerting
 * rule file (the `groups: [{ name, rules: [{ record | alert, expr, ... }] }]` shape).
 *
 * This is a deliberately **narrow**, hand-written parser tailored to exactly that shape —
 * not a general-purpose YAML parser (no anchors/aliases, no flow-style `{}`/`[]` mappings,
 * no multi-document files). That mirrors this whole package's philosophy for the PromQL
 * grammar itself: the rule-file structure Prometheus actually uses is a
 * small, well-known, bounded shape, and a purpose-built parser for exactly that shape is
 * more reliable than depending on a general YAML library for one narrow field extraction.
 * For anything outside that shape, add a real YAML dependency in your own tooling and call
 * `validatePromQL()` directly per extracted `expr` string.
 */
export function validateRecordingRuleFile(yamlText: string, options?: ValidationOptions): RuleFileValidationResult {
  const lines = yamlText.split(/\r?\n/);
  const entries: RuleValidationEntry[] = [];

  let currentGroupName = '';
  let currentRuleType: 'record' | 'alert' | null = null;
  let currentRuleName = '';
  let ruleIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const indent = leadingSpaces(raw);

    const groupMatch = /^-\s*name:\s*(.+)$/.exec(trimmed);
    if (groupMatch && /^\s*-\s*name:/.test(raw)) {
      currentGroupName = stripQuotes(groupMatch[1]!);
      currentRuleType = null;
      continue;
    }

    const ruleMatch = /^-\s*(record|alert):\s*(.+)$/.exec(trimmed);
    if (ruleMatch) {
      currentRuleType = ruleMatch[1] as 'record' | 'alert';
      currentRuleName = stripQuotes(ruleMatch[2]!);
      ruleIndent = indent;
      continue;
    }

    const exprMatch = /^expr:\s*(.*)$/.exec(trimmed);
    if (exprMatch && currentRuleType && indent > ruleIndent) {
      const exprLine = i + 1;
      const inlineValue = exprMatch[1]!.trim();
      let expr: string;

      if (inlineValue === '' || inlineValue === '|' || inlineValue === '>' || /^[|>][+-]?\d*$/.test(inlineValue)) {
        // Block scalar (literal `|` or folded `>`) — consume subsequent more-indented lines.
        const folded = inlineValue.startsWith('>');
        const blockLines: string[] = [];
        let blockBaseIndent: number | null = null;
        let j = i + 1;
        for (; j < lines.length; j++) {
          const bl = lines[j]!;
          if (bl.trim() === '') {
            blockLines.push('');
            continue;
          }
          const blIndent = leadingSpaces(bl);
          if (blIndent <= indent) break;
          if (blockBaseIndent === null) blockBaseIndent = blIndent;
          blockLines.push(bl.slice(blockBaseIndent));
        }
        i = j - 1;
        expr = folded ? blockLines.join(' ').trim() : blockLines.join('\n').trim();
      } else {
        expr = stripQuotes(inlineValue);
      }

      const result = validatePromQL(expr, options);
      entries.push({ groupName: currentGroupName, ruleType: currentRuleType, ruleName: currentRuleName, expr, line: exprLine, result });
    }
  }

  return { entries, valid: entries.every((e) => e.result.valid) };
}
