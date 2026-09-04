#!/usr/bin/env node
// `npx promql-validator lint <file>` — CI-friendly PromQL/rule-file linting.
// Wraps @promql-validator/core only (no React); see docs/troubleshooting.md and the
// "Linting recording rules in CI" recipe in docs/validation.md.
import { readFileSync } from 'node:fs';
import { validatePromQL, validateRecordingRuleFile, type Diagnostic } from '@promql-validator/core';

interface LintFinding {
  source: string;
  line: number;
  query: string;
  valid: boolean;
  diagnostics: Diagnostic[];
}

function printUsage(): void {
  process.stderr.write(
    [
      'Usage: promql-validator lint <file> [options]',
      '',
      'Options:',
      '  --rules            Treat <file> as a Prometheus recording/alerting rule YAML file',
      '                     (validates every rule\'s expr: field).',
      '  --format <fmt>     "text" (default) or "json".',
      '  -h, --help         Show this help.',
      '',
      'Without --rules, <file> is treated as one PromQL query per non-empty,',
      'non-"#"-prefixed line. Use "-" to read from stdin.',
      '',
      'Exit code is 1 if any query fails to validate, 0 otherwise.',
      '',
      'Examples:',
      '  promql-validator lint queries.txt',
      '  promql-validator lint rules.yml --rules',
      '  cat queries.txt | promql-validator lint - --format json',
    ].join('\n') + '\n',
  );
}

function readInput(path: string): string {
  if (path === '-') return readFileSync(0, 'utf8');
  return readFileSync(path, 'utf8');
}

function lintPlainQueries(source: string, text: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const result = validatePromQL(trimmed);
    findings.push({ source, line: i + 1, query: trimmed, valid: result.valid, diagnostics: result.diagnostics });
  }
  return findings;
}

function lintRuleFile(source: string, text: string): LintFinding[] {
  const result = validateRecordingRuleFile(text);
  return result.entries.map((e) => ({
    source,
    line: e.line,
    query: `${e.ruleType}:${e.ruleName} -> ${e.expr}`,
    valid: e.result.valid,
    diagnostics: e.result.diagnostics,
  }));
}

function printText(findings: LintFinding[]): void {
  let errorCount = 0;
  for (const f of findings) {
    if (f.valid) continue;
    errorCount++;
    process.stdout.write(`${f.source}:${f.line}: ${f.query}\n`);
    for (const d of f.diagnostics) {
      if (d.severity !== 'error') continue;
      process.stdout.write(`  ${d.code} (${d.line}:${d.column}): ${d.message}${d.suggestion ? ` — ${d.suggestion}` : ''}\n`);
    }
  }
  const total = findings.length;
  process.stdout.write(`\n${total - errorCount}/${total} queries valid.\n`);
}

function printJson(findings: LintFinding[]): void {
  process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const [command, ...rest] = args;
  if (command !== 'lint') {
    process.stderr.write(`Unknown command '${command}'.\n\n`);
    printUsage();
    process.exit(1);
  }

  let file: string | undefined;
  let useRules = false;
  let format: 'text' | 'json' = 'text';
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === '--rules') useRules = true;
    else if (arg === '--format') format = rest[++i] === 'json' ? 'json' : 'text';
    else if (arg === '-' || !arg.startsWith('-')) file = arg; // '-' means stdin, not a flag
  }

  if (!file) {
    process.stderr.write('Error: no input file given.\n\n');
    printUsage();
    process.exit(1);
  }

  let text: string;
  try {
    text = readInput(file);
  } catch (err) {
    process.stderr.write(`Error reading '${file}': ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
    return;
  }

  const findings = useRules ? lintRuleFile(file, text) : lintPlainQueries(file, text);

  if (format === 'json') printJson(findings);
  else printText(findings);

  process.exit(findings.some((f) => !f.valid) ? 1 : 0);
}

main();
