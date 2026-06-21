import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const title = 'Scout — Agentic Research Assistant';
const description =
  'Ask a hard question and watch an AI plan, search the web, read sources, and write a cited report — live, step by step.';

export const metadata: Metadata = {
  metadataBase: new URL('https://portfolio.n8builds.dev/scout'),
  title,
  description,
  // Image refs are injected automatically by file-based metadata
  // (opengraph-image.tsx → og:image + twitter:image).
  openGraph: {
    title,
    description,
    url: 'https://portfolio.n8builds.dev/scout',
    siteName: 'Scout',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

/**
 * Runs before paint to set the theme class, preventing a flash of the wrong
 * theme (FOUC). House style is dark-first: honor an explicit stored choice,
 * otherwise default to dark unless the OS explicitly prefers light.
 */
const themeInitScript = `(function(){try{var t=localStorage.theme;var dark=t?t==='dark':!window.matchMedia('(prefers-color-scheme: light)').matches;var c=document.documentElement.classList;if(dark){c.add('dark');document.documentElement.style.colorScheme='dark';}else{c.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
