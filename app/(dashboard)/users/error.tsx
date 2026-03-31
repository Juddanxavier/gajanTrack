'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { IconAlertCircle, IconRefresh, IconChevronLeft } from '@tabler/icons-react';
import Link from 'next/link';

export default function UsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isForbidden = error.message.includes('Forbidden') || error.message.includes('Unauthenticated');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
      <div className="p-4 bg-destructive/10 rounded-full border border-destructive/20 shadow-sm">
        <IconAlertCircle className="size-12 text-destructive" />
      </div>
      
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight">
          {isForbidden ? "Access Denied" : "Unexpected Error Encountered"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isForbidden 
            ? "You don't have the required privileges to view this section. If you believe this is an error, please contact your administrator."
            : `We've encountered a critical failure while loading the user directory. [${error.message}]`}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4">
        {isForbidden ? (
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <IconChevronLeft className="size-4" />
              Return to Dashboard
            </Link>
          </Button>
        ) : (
          <>
            <Button onClick={() => reset()} className="gap-2">
              <IconRefresh className="size-4" />
              Attempt Recovery
            </Button>
            <Button variant="outline" asChild>
               <Link href="/dashboard">Return Home</Link>
            </Button>
          </>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground italic font-mono uppercase tracking-widest fixed bottom-8">
        Ref: {error.digest || 'system-runtime-error'}
      </p>
    </div>
  );
}

