"use client";

import { ReactNode } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth, ClerkProvider } from "@clerk/nextjs";
import { OrgProvider } from "@/components/providers/org-provider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="p-8 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive max-w-md">
          <h1 className="text-xl font-semibold mb-2">Configuration Error</h1>
          <p className="text-sm">
            Missing <code className="bg-destructive/10 px-1 rounded">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>. 
            Please check your environment variables (.env.local).
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={publishableKey} 
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <OrgProvider>
          {children}
        </OrgProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

