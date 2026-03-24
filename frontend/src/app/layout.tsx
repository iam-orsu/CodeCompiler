import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Runly.dev - Run Code Instantly',
  description: 'Execute code in 20+ languages instantly. No setup. No signup. Just code.',
  keywords: 'online compiler, code editor, IDE, run code online, python, javascript, typescript, go, rust',
  openGraph: {
    title: 'Runly.dev',
    description: 'The fastest way to run code in any language.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
