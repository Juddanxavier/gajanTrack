'use client';

/** @format */

import * as React from 'react';
import {
  IconBell,
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTruck,
  IconUsers,
  IconUserPlus,
} from '@tabler/icons-react';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrg } from '@/components/providers/org-provider';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { AddShipmentDialog } from '@/components/shipments/add-shipment-dialog';
import { CreateUserDialog } from '@/components/users/create-user-dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Quotes',
      url: '/quotes',
      icon: IconListDetails,
    },
    {
      title: 'Shipments',
      url: '/shipments',
      icon: IconTruck,
    },
    {
      title: 'Analytics',
      url: '/analytics',
      icon: IconChartBar,
    },
    {
      title: 'Users',
      url: '/dashboard/users',
      icon: IconUsers,
    },
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '/settings',
      icon: IconSettings,
    },
    {
      title: 'Notifications',
      url: '/notifications',
      icon: IconBell,
    },
    {
      title: 'Get Help',
      url: '/help',
      icon: IconHelp,
    },
    {
      title: 'Search',
      url: '#',
      icon: IconSearch,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sessionId } = useOrg();
  const user = useQuery(api.users.queries.getCurrentUser, { sessionId });
  const isLoaded = user !== undefined;

  const userData = React.useMemo(() => {
    if (!user) return { name: 'User', email: '', avatar: '', role: '' };
    return {
      name: user.name || 'User',
      email: user.email || '',
      avatar: user.image || user.avatarUrl || '',
      role: user.role || '',
    };
  }, [user]);

  if (!isLoaded) return null;


  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className='data-[slot=sidebar-menu-button]:p-1.5!'>
              <a href='/dashboard'>
                <IconInnerShadowTop className='size-5!' />
                <span className='text-base font-semibold'>{(process.env.NEXT_PUBLIC_APP_NAME || 'GT Express').toUpperCase()}</span>
              </a>

            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <AddShipmentDialog>
                  <SidebarMenuButton className='text-primary hover:text-primary transition-colors'>
                    <IconPlus className='size-4' />
                    <span className='font-bold uppercase tracking-widest text-[10px]'>Create Shipment</span>
                  </SidebarMenuButton>
                </AddShipmentDialog>
              </SidebarMenuItem>
              {(userData.role === 'admin' || userData.role === 'staff') && (
                <SidebarMenuItem>
                  <CreateUserDialog>
                    <SidebarMenuButton className='text-secondary-foreground/80'>
                      <IconUserPlus className='size-4' />
                      <span className='font-bold uppercase tracking-widest text-[10px]'>Create User</span>
                    </SidebarMenuButton>
                  </CreateUserDialog>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className='mt-auto' />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}

