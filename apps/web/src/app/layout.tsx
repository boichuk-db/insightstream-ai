import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'InsightStream AI',
  description: 'AI-driven feedback and sentiment analysis platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
    >
      <body className="min-h-full flex flex-col font-sans bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

