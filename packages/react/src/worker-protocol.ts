import type { ValidationOptions, ValidationResult } from '@promql-validator/core';

export interface WorkerRequest {
  id: number;
  type: 'validate';
  query: string;
  options?: ValidationOptions;
}

export type WorkerResponse = { id: number; type: 'result'; result: ValidationResult } | { id: number; type: 'error'; error: string };
