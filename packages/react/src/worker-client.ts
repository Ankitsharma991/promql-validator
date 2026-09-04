import type { ValidationOptions, ValidationResult } from '@promql-validator/core';
import type { WorkerRequest, WorkerResponse } from './worker-protocol.js';

/**
 * Main-thread controller for the optional validation worker. Never constructed at module
 * scope or during render — only lazily, inside an effect, and only when a consumer opts in
 * via `useWorker` (Part 88: "do not force every simple query through a worker if the
 * overhead is larger than the computation" — our own benchmarks show the main thread is not
 * the bottleneck at any realistic scale, so this exists as a genuinely working opt-in for
 * hosts with unusual constraints, not a default).
 */
export class ValidationWorkerClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (r: ValidationResult) => void; reject: (e: Error) => void }>();
  private initError: Error | null = null;

  constructor() {
    if (typeof Worker === 'undefined') {
      this.initError = new Error('Web Worker is not available in this environment.');
      return;
    }
    try {
      // Resolved relative to *this module's* built location (dist/index.mjs sits next to
      // dist/worker.mjs), which is robust regardless of the consumer's node_modules layout —
      // unlike referencing a worker shipped by a different package, this never has to cross
      // a package boundary at resolution time.
      this.worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handleMessage(event.data);
      this.worker.onerror = (event) => this.handleFatalError(event.message ?? 'Worker error');
    } catch (err) {
      this.initError = err instanceof Error ? err : new Error(String(err));
    }
  }

  private handleMessage(msg: WorkerResponse): void {
    const entry = this.pending.get(msg.id);
    if (!entry) return;
    this.pending.delete(msg.id);
    if (msg.type === 'result') entry.resolve(msg.result);
    else entry.reject(new Error(msg.error));
  }

  private handleFatalError(message: string): void {
    for (const [, entry] of this.pending) entry.reject(new Error(message));
    this.pending.clear();
  }

  get available(): boolean {
    return this.worker !== null;
  }

  validate(query: string, options?: ValidationOptions): Promise<ValidationResult> {
    if (!this.worker) {
      return Promise.reject(this.initError ?? new Error('Validation worker unavailable.'));
    }
    const id = this.nextId++;
    const request: WorkerRequest = { id, type: 'validate', query, options };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage(request);
    });
  }

  dispose(): void {
    this.handleFatalError('Validation worker disposed.');
    this.worker?.terminate();
    this.worker = null;
  }
}
