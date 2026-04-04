'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrg } from '@/components/providers/org-provider';
import { useRouter } from 'next/navigation';
import { UserList } from '@/components/users/user-list';
import { CreateUserDialog } from '@/components/users/create-user-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from '@/components/sparkline';
import { 
  IconUserPlus, 
  IconUsers, 
  IconShieldCheck, 
  IconUserCircle, 
  IconUserSearch 
} from '@tabler/icons-react';

export default function UsersPage() {
  const router = useRouter();
  const { sessionId } = useOrg();
  const currentUser = useQuery(api.users.queries.getCurrentUser, { sessionId });
  const users = useQuery(api.users.queries.listUsers, { sessionId });
  const userStats = useQuery(api.users.queries.getUserStats, { sessionId });
  const organizations = useQuery(api.organizations.queries.listOrganizations, { sessionId });

  React.useEffect(() => {
    if (currentUser && currentUser.role === 'customer') {
      router.push('/unauthorized');
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role === 'customer') return null;

  const isAdmin = currentUser.role === 'admin';
  const canCreateUsers = isAdmin || currentUser.role === 'staff';

  const stats = userStats || { total: 0, admin: 0, staff: 0, customer: 0, sparklines: {} };

  // Create an org map for easy name resolution
  const orgMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    organizations?.forEach((org: any) => {
      map[org._id] = org.name;
    });
    return map;
  }, [organizations]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground font-medium">
            {isAdmin 
              ? "Global control center for all platform identities and roles." 
              : "Manage your team members and customers."}
          </p>
        </div>
        {canCreateUsers && (
          <CreateUserDialog>
            <Button className="gap-2 shadow-xl font-bold uppercase tracking-widest text-[10px] h-11 px-6">
              <IconUserPlus className="size-4" />
              Provision New User
            </Button>
          </CreateUserDialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Users" 
          value={stats.total} 
          icon={<IconUsers className="size-4 text-primary" />}
          description={isAdmin ? "Total active identities" : "Users in your organization"}
          chart={(stats as any).sparklines?.total}
          color="hsl(var(--primary))"
        />
        {isAdmin && (
          <StatCard 
            title="Admins" 
            value={stats.admin} 
            icon={<IconShieldCheck className="size-4 text-indigo-500" />}
            description="Platform moderators"
            chart={(stats as any).sparklines?.admin}
            color="var(--chart-3)"
          />
        )}
        <StatCard 
          title="Staff" 
          value={stats.staff} 
          icon={<IconUserCircle className="size-4 text-amber-500" />}
          description={isAdmin ? "Operational users" : "Your colleagues"}
          chart={(stats as any).sparklines?.staff}
          color="var(--chart-4)"
        />
        <StatCard 
          title="Customers" 
          value={stats.customer} 
          icon={<IconUserSearch className="size-4 text-emerald-500" />}
          description="End users"
          chart={(stats as any).sparklines?.customer}
          color="var(--chart-2)"
        />
      </div>

      {/* User List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tighter uppercase">Identities</h2>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Live Directory</span>
          </div>
        </div>
        <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
            <CardContent className="p-0">
                <UserList 
                    users={users} 
                    currentUser={currentUser} 
                    orgMap={orgMap} 
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description, chart, color }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  description: string;
  chart?: any[];
  color?: string;
}) {
  return (
    <Card className="relative border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/40 transition-all duration-500 overflow-hidden group">
      {/* Spotlight Glows */}
      <div className="absolute -right-20 -top-20 size-48 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
          {title}
        </CardTitle>
        <div className="opacity-20 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex items-end justify-between">
            <div className="text-3xl font-black tabular-nums tracking-tighter">{value}</div>
            <div className="w-16 h-8 mb-1 opacity-20 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110">
                {chart && chart.length > 0 && (
                    <Sparkline data={chart} color={color} />
                )}
            </div>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-tight">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

