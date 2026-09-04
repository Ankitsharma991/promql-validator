import { describe, expect, it } from 'vitest';
import { ValidationWorkerClient } from '../worker-client.js';

describe('ValidationWorkerClient — graceful degradation', () => {
  it('reports unavailable rather than throwing when Worker does not exist (e.g. jsdom, SSR)', () => {
    expect(typeof Worker).toBe('undefined');
    const client = new ValidationWorkerClient();
    expect(client.available).toBe(false);
  });

  it('rejects validate() with a clear error instead of hanging forever when unavailable', async () => {
    const client = new ValidationWorkerClient();
    await expect(client.validate('up')).rejects.toThrow();
  });

  it('dispose() is safe to call even when the worker never initialized', () => {
    const client = new ValidationWorkerClient();
    expect(() => client.dispose()).not.toThrow();
  });
});
