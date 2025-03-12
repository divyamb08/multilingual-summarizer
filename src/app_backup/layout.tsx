
import { Inter } from 'next/font/google';
import './globals.css';
import '../styles/pdf.css';
import Link from 'next/link';
import { FiHome, FiSettings, FiClock, FiFileText } from 'react-icons/fi';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Multilingual Content Summarizer',
  description: 'Summarize content in any language using AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Polyfill setup removed temporarily for debugging
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700/50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-700">
                  Multilingual Summarizer
                </span>
              </Link>
              <nav className="hidden md:flex items-center space-x-1">
                <Link href="/" className="px-3 py-2 rounded-lg text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                  <span className="flex items-center"><FiHome className="mr-1.5" /> Home</span>
                </Link>
                <Link href="/history" className="px-3 py-2 rounded-lg text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                  <span className="flex items-center"><FiClock className="mr-1.5" /> History</span>
                </Link>
                <Link href="/settings" className="px-3 py-2 rounded-lg text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                  <span className="flex items-center"><FiSettings className="mr-1.5" /> Settings</span>
                </Link>
                <Link href="/pdf-test" className="px-3 py-2 rounded-lg text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                  <span className="flex items-center"><FiFileText className="mr-1.5" /> PDF Test</span>
                </Link>
              </nav>
              <div className="flex md:hidden gap-1">
                <Link href="/" className="p-2 text-neutral-600 hover:text-primary-600 dark:text-neutral-200">
                  <FiHome size={20} />
                </Link>
                <Link href="/history" className="p-2 text-neutral-600 hover:text-primary-600 dark:text-neutral-200">
                  <FiClock size={20} />
                </Link>
                <Link href="/settings" className="p-2 text-neutral-600 hover:text-primary-600 dark:text-neutral-200">
                  <FiSettings size={20} />
                </Link>
                <Link href="/pdf-test" className="p-2 text-neutral-600 hover:text-primary-600 dark:text-neutral-200">
                  <FiFileText size={20} />
                </Link>
              </div>
            </div>
          </header>
          <div className="container mx-auto px-4 py-6 md:py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}