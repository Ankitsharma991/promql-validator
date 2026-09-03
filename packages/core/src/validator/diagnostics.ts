export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * Stable, documented diagnostic codes. Never remove or repurpose a code without a
 * major version bump — hosts are expected to branch on `code`, not on `message` text.
 */
export const DiagnosticCode = {
  UnclosedBracket: 'PQ_UNCLOSED_BRACKET',
  UnexpectedToken: 'PQ_UNEXPECTED_TOKEN',
  UnexpectedEOF: 'PQ_UNEXPECTED_EOF',
  InvalidDuration: 'PQ_INVALID_DURATION',
  WrongArity: 'PQ_WRONG_ARITY',
  WrongArgType: 'PQ_WRONG_ARG_TYPE',
  UnknownFunction: 'PQ_UNKNOWN_FUNCTION',
  UnknownAggregation: 'PQ_UNKNOWN_AGGREGATION',
  MissingLabelValue: 'PQ_MISSING_LABEL_VALUE',
  InvalidLabelName: 'PQ_INVALID_LABEL_NAME',
  InvalidVectorMatch: 'PQ_INVALID_VECTOR_MATCH',
  ConflictingModifiers: 'PQ_CONFLICTING_MODIFIERS',
  InvalidBoolModifier: 'PQ_INVALID_BOOL_MODIFIER',
  UnterminatedString: 'PQ_UNTERMINATED_STRING',
  TooComplex: 'PQ_TOO_COMPLEX',
  QueryTooLong: 'PQ_QUERY_TOO_LONG',
  EmptyLabelMatcherList: 'PQ_EMPTY_LABEL_MATCHER_LIST',
  DuplicateLabelMatcher: 'PQ_DUPLICATE_LABEL_MATCHER',
} as const;

export type DiagnosticCodeValue = (typeof DiagnosticCode)[keyof typeof DiagnosticCode];

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  code: string;
  start: number;
  end: number;
  line: number;
  column: number;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
  incomplete: boolean;
}
