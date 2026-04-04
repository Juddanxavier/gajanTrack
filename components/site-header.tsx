"use client";

/** @format */

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ModeToggle } from '@/components/mode-toggle';
import { HeaderAuth } from '@/app/components/HeaderAuth';
import { OrgSwitcher } from '@/components/org-switcher';
import { NotificationBell } from '@/components/dashboard/notification-bell';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrg } from '@/components/providers/org-provider';

export function SiteHeader() {
  const { sessionId } = useOrg();
  const settingsCtx = useQuery(api.organizations.queries.getSettings, { sessionId });
  const orgName = settingsCtx?.organization?.name || process.env.NEXT_PUBLIC_APP_NAME || 'GT Express';

  return (
    <header className='sticky top-0 z-50 flex h-[4rem] shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-300'>
      <div className='flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
        <SidebarTrigger className='-ml-1 hover:bg-accent transition-colors rounded-md' />
        <Separator
          orientation='vertical'
          className='mx-2 h-4 bg-border/40'
        />
        <div className='flex items-center gap-4'>
           <div className="flex items-center gap-2 pr-4 border-r border-border/40">
             {settingsCtx?.organization?.logoUrl ? (
               <img src={settingsCtx.organization.logoUrl} alt={orgName} className="h-6 w-auto object-contain rounded-sm" />
             ) : (
               <div className="h-6 w-1 bg-primary rounded-full hidden sm:block" />
             )}
             <h1 className='hidden sm:block text-lg font-semibold tracking-tight text-foreground text-xs uppercase opacity-70 truncate max-w-[150px]'>{orgName}</h1>
           </div>
           <OrgSwitcher />
        </div>

        
        <div className='ml-auto flex items-center gap-3'>
          <NotificationBell />
          <ModeToggle />
          <div className="h-4 w-px bg-border/40 mx-1" />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}

