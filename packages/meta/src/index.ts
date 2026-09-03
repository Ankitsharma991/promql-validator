// Convenience meta-package: re-exports @promql-validator/react (which itself re-exports
// everything from @promql-validator/core), so `npm install promql-validator` "just works"
// for the common case. Power users can depend on @promql-validator/core alone to avoid
// pulling in React entirely.
export * from '@promql-validator/react';
