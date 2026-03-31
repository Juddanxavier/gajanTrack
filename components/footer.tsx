'use client';

import * as React from 'react';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GT Express';
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-6 md:px-8 md:py-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
          &copy; {currentYear} <strong>{appName}</strong>. All rights reserved.
        </p>
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground">Version {appVersion}</span>
          </div>
          <Separator orientation="vertical" className="hidden h-4 md:block" />
          <nav className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <a
              href="#"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Help Center
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
