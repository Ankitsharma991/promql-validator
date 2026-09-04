import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    // Splitting is required for the `suggestionListMode="virtualized"` code path
    // (VirtualizedSuggestionPopupImpl.tsx, dynamically imported) to land in its own chunk
    // rather than being inlined with a hoisted static import of the optional
    // `@tanstack/react-virtual` peer dependency — see that file's docstring.
    splitting: true,
    treeshake: true,
    target: 'es2020',
    external: ['react', 'react-dom', '@tanstack/react-virtual'],
    outExtension({ format }) {
      return { js: format === 'cjs' ? '.cjs' : '.mjs' };
    },
  },
  {
    // The optional validation worker (`useWorker` prop) is built as its own fully
    // self-contained bundle — @promql-validator/core is deliberately *not* external here
    // (unlike the main entry above), since a plain `new Worker(url, {type:'module'})` never
    // passes through the consumer's own bundler and so can't resolve a bare
    // `@promql-validator/core` import at runtime. ESM-only: `{ type: 'module' }` workers are
    // universally supported in every currently-evergreen browser this package targets.
    entry: { worker: 'src/worker-entry.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
    target: 'es2020',
    noExternal: [/.*/],
    outExtension() {
      return { js: '.mjs' };
    },
  },
]);
