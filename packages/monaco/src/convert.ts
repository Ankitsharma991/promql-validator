import type { editor, IRange, languages, MarkerSeverity as MarkerSeverityType } from 'monaco-editor';
import type { Diagnostic, Suggestion } from '@promql-validator/core';

// Values (not just types) needed for the enum-like fields below — declared as a minimal
// structural interface rather than importing monaco-editor's value exports, so this module
// stays testable without a real monaco-editor instance (only its .d.ts, already required
// for the `import type`s above, which — unlike a value import — costs nothing at runtime
// for consumers who never call these functions).
interface MonacoEnums {
  languages: { CompletionItemKind: typeof languages.CompletionItemKind };
  MarkerSeverity: typeof MarkerSeverityType;
}

const CATEGORY_TO_KIND: Record<string, keyof typeof languages.CompletionItemKind> = {
  'promql-function': 'Function',
  aggregation: 'Function',
  operator: 'Operator',
  modifier: 'Keyword',
  duration: 'Value',
  'label-name': 'Property',
  'monitoring-term': 'Text',
  metric: 'Variable',
  'label-value': 'EnumMember',
};

export function suggestionToCompletionItem(s: Suggestion, monaco: MonacoEnums, range: IRange): languages.CompletionItem {
  const kindName = (s.category && CATEGORY_TO_KIND[s.category]) || 'Text';
  return {
    label: s.label,
    kind: monaco.languages.CompletionItemKind[kindName],
    insertText: s.insertText ?? s.value,
    insertTextRules: s.insertText?.includes('$0') ? 4 /* InsertAsSnippet */ : undefined,
    detail: s.detail,
    documentation: s.description,
    sortText: typeof s.priority === 'number' ? String(1000 - s.priority).padStart(6, '0') : undefined,
    range,
  };
}

export function diagnosticToMarker(d: Diagnostic, monaco: MonacoEnums, startPos: { lineNumber: number; column: number }, endPos: { lineNumber: number; column: number }): editor.IMarkerData {
  const severity = d.severity === 'error' ? monaco.MarkerSeverity.Error : d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info;
  return {
    severity,
    message: d.suggestion ? `${d.message} ${d.suggestion}` : d.message,
    startLineNumber: startPos.lineNumber,
    startColumn: startPos.column,
    endLineNumber: endPos.lineNumber,
    endColumn: endPos.column,
    code: d.code,
  };
}
