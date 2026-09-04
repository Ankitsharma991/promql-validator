// Entry point for the optional validation Web Worker (`useWorker` prop on <PromQLInput/>).
// Built as its own fully self-contained bundle (dist/worker.mjs, @promql-validator/core
// inlined rather than external — see tsup.worker.config.ts) so it can be loaded via a plain
// `new Worker(url, { type: 'module' })` without requiring the *consumer's* bundler to
// resolve a bare `@promql-validator/core` specifier inside a script that never passes
// through their build (a real browser's native module loader can't resolve bare
// specifiers on its own).
import { validatePromQL, type ValidationOptions } from '@promql-validator/core';
import type { WorkerRequest, WorkerResponse } from './worker-protocol.js';

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== 'validate') return;
  try {
    const result = validatePromQL(msg.query, msg.options as ValidationOptions);
    const response: WorkerResponse = { id: msg.id, type: 'result', result };
    (self as unknown as Worker).postMessage(response);
  } catch (error) {
    const response: WorkerResponse = { id: msg.id, type: 'error', error: error instanceof Error ? error.message : String(error) };
    (self as unknown as Worker).postMessage(response);
  }
};
