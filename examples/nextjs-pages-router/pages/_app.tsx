import type { AppProps } from 'next/app';
// Loaded as a real stylesheet so the server-rendered HTML is styled before hydration;
// the editors below pass injectStyles={false} so no second copy is added.
import '@promql-validator/react/styles.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
