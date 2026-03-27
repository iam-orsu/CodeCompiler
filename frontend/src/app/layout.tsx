import type { Metadata } from 'next';
import './globals.css';

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans h-full antialiased" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
