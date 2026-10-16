import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The packages never make network requests on their own; only a host-supplied
// suggestionProvider can. This guards that promise for every published package.
const packagesDir = fileURLToPath(new URL('../../../', import.meta.url));
const NETWORK_APIS = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\s*\(|new\s+(XMLHttpRequest|WebSocket|EventSource)\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('no network access', () => {
  const files = ['core', 'react', 'meta', 'monaco', 'codemirror'].flatMap((pkg) => sourceFiles(join(packagesDir, pkg, 'src')));

  it('scans every published source file', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files.map((f) => [f.slice(packagesDir.length)]))('%s calls no network API', (relative) => {
    const code = readFileSync(join(packagesDir, relative), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(NETWORK_APIS);
  });
});
