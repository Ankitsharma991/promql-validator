// `?inline` imports return the file's contents as a string (Vite in tests, an esbuild
// plugin in tsup.config.ts for the published build).
declare module '*.css?inline' {
  const css: string;
  export default css;
}
