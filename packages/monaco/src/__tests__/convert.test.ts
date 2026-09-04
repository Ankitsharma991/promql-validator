import { describe, expect, it } from 'vitest';
import { suggestionToCompletionItem, diagnosticToMarker } from '../convert.js';
import type { Diagnostic, Suggestion } from '@promql-validator/core';

// A minimal structural stand-in for the enum values our pure conversion functions need —
// real callers pass the actual `monaco` namespace (its enum members are plain numbers, so
// this mirrors that shape exactly without requiring a real monaco-editor runtime in tests).
const mockMonaco = {
  languages: {
    CompletionItemKind: {
      Function: 1,
      Operator: 2,
      Keyword: 3,
      Value: 4,
      Property: 5,
      Text: 6,
      Variable: 7,
      EnumMember: 8,
    },
  },
  MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 },
} as never;

describe('suggestionToCompletionItem', () => {
  const range = { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 5 };

  it('maps a function suggestion to the Function completion kind', () => {
    const s: Suggestion = { label: 'rate', value: 'rate', category: 'promql-function', detail: 'rate(v)', description: 'rate desc' };
    const item = suggestionToCompletionItem(s, mockMonaco, range);
    expect(item.label).toBe('rate');
    expect(item.kind).toBe(mockMonaco.languages.CompletionItemKind.Function);
    expect(item.detail).toBe('rate(v)');
    expect(item.documentation).toBe('rate desc');
    expect(item.range).toBe(range);
  });

  it('falls back to insertText over value when present', () => {
    const s: Suggestion = { label: 'rate', value: 'rate', insertText: 'rate($0[5m])', category: 'promql-function' };
    const item = suggestionToCompletionItem(s, mockMonaco, range);
    expect(item.insertText).toBe('rate($0[5m])');
    expect(item.insertTextRules).toBe(4);
  });

  it('does not set snippet rules when insertText has no placeholder', () => {
    const s: Suggestion = { label: 'up', value: 'up', category: 'metric' };
    const item = suggestionToCompletionItem(s, mockMonaco, range);
    expect(item.insertTextRules).toBeUndefined();
  });

  it('falls back to Text kind for an unrecognized category', () => {
    const s: Suggestion = { label: 'x', value: 'x', category: 'something-custom' };
    const item = suggestionToCompletionItem(s, mockMonaco, range);
    expect(item.kind).toBe(mockMonaco.languages.CompletionItemKind.Text);
  });
});

describe('diagnosticToMarker', () => {
  const pos = (line: number, col: number) => ({ lineNumber: line, column: col });

  it('maps error severity correctly', () => {
    const d: Diagnostic = { severity: 'error', code: 'PQ_UNCLOSED_BRACKET', message: 'bad', start: 0, end: 5, line: 1, column: 1 };
    const marker = diagnosticToMarker(d, mockMonaco, pos(1, 1), pos(1, 6));
    expect(marker.severity).toBe(mockMonaco.MarkerSeverity.Error);
    expect(marker.code).toBe('PQ_UNCLOSED_BRACKET');
    expect(marker.startColumn).toBe(1);
    expect(marker.endColumn).toBe(6);
  });

  it('maps warning and info severities correctly', () => {
    const warn: Diagnostic = { severity: 'warning', code: 'X', message: 'w', start: 0, end: 1, line: 1, column: 1 };
    const info: Diagnostic = { severity: 'info', code: 'Y', message: 'i', start: 0, end: 1, line: 1, column: 1 };
    expect(diagnosticToMarker(warn, mockMonaco, pos(1, 1), pos(1, 2)).severity).toBe(mockMonaco.MarkerSeverity.Warning);
    expect(diagnosticToMarker(info, mockMonaco, pos(1, 1), pos(1, 2)).severity).toBe(mockMonaco.MarkerSeverity.Info);
  });

  it('appends the suggestion text to the message when present', () => {
    const d: Diagnostic = { severity: 'warning', code: 'PQ_UNKNOWN_FUNCTION', message: "Unknown function 'rat'.", start: 0, end: 3, line: 1, column: 1, suggestion: "Did you mean 'rate'?" };
    const marker = diagnosticToMarker(d, mockMonaco, pos(1, 1), pos(1, 4));
    expect(marker.message).toContain('Did you mean');
  });
});
