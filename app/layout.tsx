/** @format */

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './global.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

import { ThemeProvider } from '@/components/theme-provider';
export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'GT Express',
  description: 'Your premium shipment tracking platform.',
};


import { ConvexClientProvider } from '@/lib/convex';
import { Toaster } from '@/components/ui/sonner';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        <ConvexClientProvider>
          <Toaster position='bottom-right' richColors />
          <ThemeProvider
            attribute='class'
            defaultTheme='dark'
            enableSystem={false}
            disableTransitionOnChange>
            <div className='flex flex-1 flex-col min-h-screen'>{children}</div>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

