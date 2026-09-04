import { describe, expect, it, beforeAll } from 'vitest';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);
const CLI_PATH = join(__dirname, '..', '..', 'dist', 'cli.mjs');

function run(args: string[]) {
  return execFileAsync('node', [CLI_PATH, ...args]).catch((e) => e);
}

/** `execFile`'s promisified form has no way to pipe stdin (that's a `spawnSync`-only
 * option) — real stdin piping needs `spawn` and manually writing to the child's stdin. */
function runWithStdin(args: string[], input: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.write(input);
    child.stdin.end();
  });
}

describe('promql-validator CLI', () => {
  let dir: string;

  beforeAll(() => {
    if (!existsSync(CLI_PATH)) {
      throw new Error(`CLI not built at ${CLI_PATH} — run \`npm run build\` in packages/meta first.`);
    }
    dir = mkdtempSync(join(tmpdir(), 'promql-cli-test-'));
  });

  it('exits 0 and reports all valid for a file of valid queries', async () => {
    const file = join(dir, 'valid.txt');
    writeFileSync(file, 'up\nrate(x[5m])\n# a comment\nsum by (a) (b)\n');
    const result = await run(['lint', file]);
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('3/3 queries valid');
  });

  it('exits 1 and reports diagnostics for a file with an invalid query', async () => {
    const file = join(dir, 'invalid.txt');
    writeFileSync(file, 'up\nrate(x[5m)\n');
    const result = await run(['lint', file]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('PQ_UNCLOSED_BRACKET');
    expect(result.stdout).toContain('1/2 queries valid');
  });

  it('supports --format json with valid JSON output', async () => {
    const file = join(dir, 'json.txt');
    writeFileSync(file, 'up\nrate(x[5m)\n');
    const result = await run(['lint', file, '--format', 'json']);
    const parsed = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[1].valid).toBe(false);
    expect(parsed[1].diagnostics[0].code).toBe('PQ_UNCLOSED_BRACKET');
  });

  it('supports --rules for a Prometheus recording-rule YAML file', async () => {
    const file = join(dir, 'rules.yml');
    writeFileSync(file, 'groups:\n  - name: g\n    rules:\n      - record: broken\n        expr: rate(x[5m)\n');
    const result = await run(['lint', file, '--rules']);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('PQ_UNCLOSED_BRACKET');
  });

  it('reads from stdin when the file argument is "-"', async () => {
    const result = await runWithStdin(['lint', '-'], 'up\nrate(x[5m)\n');
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('1/2 queries valid');
  });

  it('prints usage and exits non-zero with no arguments', async () => {
    const result = await run([]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('Usage:');
  });

  it('prints usage and exits 0 with --help', async () => {
    const result = await run(['--help']);
    expect(result.code ?? 0).toBe(0);
    expect(result.stderr).toContain('Usage:');
  });

  it('exits non-zero with a clear error for a nonexistent file', async () => {
    const result = await run(['lint', join(dir, 'does-not-exist.txt')]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('Error reading');
  });

  it('exits non-zero for an unknown subcommand', async () => {
    const result = await run(['frobnicate', 'x']);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("Unknown command 'frobnicate'");
  });
});
