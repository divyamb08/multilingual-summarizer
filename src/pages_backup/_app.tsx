import type { AppProps } from 'next/app';
// Load polyfills before anything else
import '../utils/polyfills';
import '../app/globals.css';
import '../styles/pdf.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <main>
      <Component {...pageProps} />
    </main>
  );
}

export default MyApp;
