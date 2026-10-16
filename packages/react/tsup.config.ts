import { readFileSync } from 'node:fs';
import { defineConfig, type Options } from 'tsup';

// Lets `import css from './styles.css?inline'` bundle the stylesheet as a string, so the
// component can inject its default styles without a separate CSS import.
const inlineCss: NonNullable<Options['esbuildPlugins']>[number] = {
  name: 'inline-css',
  setup(build) {
    // The resolved path keeps its `?inline` suffix so tsup's own `.css` handling never claims it.
    build.onResolve({ filter: /\.css\?inline$/ }, (args) => ({
      path: new URL(args.path, `file://${args.resolveDir}/`).pathname + '?inline',
      namespace: 'inline-css',
    }));
    build.onLoad({ filter: /.*/, namespace: 'inline-css' }, (args) => ({
      // Comments and indentation only; the published styles.css keeps them.
      contents: readFileSync(args.path.replace(/\?inline$/, ''), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim(),
      loader: 'text',
    }));
  },
};

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
    esbuildPlugins: [inlineCss],
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
