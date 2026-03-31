'use client';

import * as React from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { useOrg } from "@/components/providers/org-provider";

export function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardInner>
        {children}
      </DashboardInner>
    </SidebarProvider>
  );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { isLoaded: isClerkLoaded, signOut } = useAuth();
  const { sessionId, isSyncing, isLoading: isOrgLoading } = useOrg();
  const currentUser = useQuery(api.users.queries.getCurrentUser, { sessionId });

  const showSyncing = isSyncing || (isClerkLoaded && currentUser === null);

  if (!isClerkLoaded || isOrgLoading || showSyncing) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen bg-background/50">
        <SiteHeader />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="container mx-auto p-2 space-y-8 animate-in fade-in duration-500">
            {children}
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </>
  );
}


