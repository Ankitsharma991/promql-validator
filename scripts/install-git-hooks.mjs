// Points git at the repo's .githooks folder (runs on `npm install` via the "prepare"
// script). Silently does nothing outside a git checkout, e.g. in CI caches or tarballs.
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
  // not a git checkout, or git isn't installed: nothing to do
}
