'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrg } from '@/components/providers/org-provider';
import { useParams, useRouter } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  IconArrowLeft, 
  IconShield, 
  IconUser, 
  IconMail, 
  IconPhone, 
  IconCalendarEvent,
  IconBuilding,
  IconFingerprint,
  IconActivity,
  IconSettings,
  IconLock
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { EditUserForm } from '@/components/users/edit-user-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { sessionId } = useOrg();
  const userId = params.userId as Id<'users'>;
  
  const user = useQuery(api.users.queries.getUser, { id: userId, sessionId });
  const currentUser = useQuery(api.users.queries.getCurrentUser, { sessionId });
  const organizations = useQuery(api.organizations.queries.listOrganizations, { sessionId });

  React.useEffect(() => {
    if (currentUser && currentUser.role === 'customer') {
      router.push('/unauthorized');
    }
  }, [currentUser, router]);

  const orgMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    organizations?.forEach((org: any) => {
      map[org._id] = org.name;
    });
    return map;
  }, [organizations]);

  if (user === undefined || currentUser === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 animate-pulse">Synchronizing Identity...</p>
        </div>
      </div>
    );
  }

  if (user === null || currentUser === null || currentUser.role === 'customer') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
           <div className="p-6 bg-muted/20 rounded-full inline-block">
              <IconUser size={48} className="text-muted-foreground/20" />
           </div>
           <h2 className="text-2xl font-bold tracking-tight">Identity Not Found</h2>
           <p className="text-muted-foreground max-w-xs mx-auto">The user record you are looking for does not exist or you do not have permission to view it.</p>
           <Button onClick={() => router.push('/users')} variant="outline">Return to Directory</Button>
        </div>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    admin: "text-primary border-primary/20 bg-primary/5",
    staff: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    customer: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
  };

  return (
    <div className='flex-1 flex flex-col min-h-screen bg-background'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-3 px-6 lg:px-8 flex items-center justify-between shadow-sm'>
        <div className="flex items-center gap-4">
          <Button variant='ghost' size="icon" onClick={() => router.back()} className='h-8 w-8 rounded-full'>
            <IconArrowLeft className="h-4 w-4" /> 
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <h2 className="text-sm font-semibold tracking-tight uppercase">
            User Identity
          </h2>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border/40">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Verified Record</span>
            </div>
        </div>
      </div>

      <div className='flex-1 p-6 lg:p-12 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700'>
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <Avatar className="size-24 border-4 border-background shadow-2xl ring-1 ring-border/40">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback className="text-2xl font-black bg-primary/5 text-primary">
                    {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
            </Avatar>
            
            <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase">{user.name || 'Anonymous User'}</h1>
                    <Badge variant="outline" className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${roleColors[user.role || 'customer']}`}>
                        <IconShield className="size-3 mr-1.5" />
                        {user.role || 'customer'}
                    </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground/60 font-medium">
                        <IconMail size={16} className="text-primary/40" />
                        {user.email || 'No email provided'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/60 font-medium">
                        <IconPhone size={16} className="text-primary/40" />
                        {user.phone || 'No contact number'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/60 font-medium">
                        <IconBuilding size={16} className="text-primary/40" />
                        {orgMap[user.orgId as string] || 'Global Access'}
                    </div>
                </div>
            </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-muted/30 p-1 h-auto border border-border/40 mb-8">
                <TabsTrigger value="overview" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <IconActivity className="size-3.5" />
                    Overview
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <IconSettings className="size-3.5" />
                    Settings
                </TabsTrigger>
                {currentUser!.role === 'admin' && (
                    <TabsTrigger value="access" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <IconLock className="size-3.5" />
                        Security
                    </TabsTrigger>
                )}
            </TabsList>

            <TabsContent value="overview" className="animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="grid gap-8 md:grid-cols-3">
                    <Card className="md:col-span-2 border-border/40 bg-card/40 backdrop-blur-xl shadow-xl overflow-hidden group">
                        <CardHeader className="border-b border-border/10 bg-muted/5">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Identity Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid gap-12 sm:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic">External ID</p>
                                        <div className="flex items-center gap-2 text-xs font-mono bg-muted/30 p-3 rounded-lg border border-border/40 group-hover:border-primary/20 transition-all">
                                            <IconFingerprint size={12} className="text-primary/40" />
                                            {user.externalId}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic">Member Since</p>
                                        <div className="flex items-center gap-2 text-xs font-bold p-3">
                                            <IconCalendarEvent size={16} className="text-primary/40" />
                                            {format(user._creationTime, 'MMMM dd, yyyy')}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                     <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            <div className="size-2 rounded-full bg-primary animate-pulse" />
                                            System Status
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            This identity is currently **active** and synchronized with the central authentication provider. All operational logs are being tracked under this unique manifest.
                                        </p>
                                     </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-8">
                        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Activity Pulse</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 py-4 border-l-2 border-emerald-500/20 pl-4 hover:border-emerald-500/60 transition-all cursor-default">
                                    <div className="size-2 rounded-full bg-emerald-500" />
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold uppercase">Record Synchronized</p>
                                        <p className="text-[9px] text-muted-foreground/60 italic font-mono">{format(user._creationTime, 'PPP')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 py-4 opacity-30 border-l-2 border-border/40 pl-4 grayscale">
                                    <div className="size-2 rounded-full bg-muted-foreground" />
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold uppercase">Last Login Event</p>
                                        <p className="text-[9px] text-muted-foreground/60 italic font-mono">TBD</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="settings" className="animate-in fade-in slide-in-from-right-4 duration-500 focus-visible:ring-0">
                <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/10 bg-muted/5 p-8">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-xl font-black tracking-tight uppercase">Operational Parameters</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium italic">Provision and update identity fieldsets and operational roles.</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <EditUserForm user={user} currentUser={currentUser!} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="access" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <Card className="border-rose-500/20 bg-rose-500/5 backdrop-blur-xl shadow-xl overflow-hidden">
                    <CardHeader className="bg-rose-500/10 p-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-rose-500/20 rounded-xl text-rose-600">
                                <IconLock size={24} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <CardTitle className="text-xl font-black uppercase tracking-tight text-rose-900">Privileged Guard</CardTitle>
                                <p className="text-xs text-rose-700/60 font-bold uppercase tracking-widest">Admin Authorization Required</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="p-6 bg-background/40 border border-rose-500/10 rounded-2xl space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-widest text-rose-900 flex items-center gap-2">
                                <IconShield size={16} />
                                Access Policy Details
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Access policies for **{user.name}** are governed by their role as a **{user.role}**. 
                                {user.role === 'admin' ? 
                                    " This identity has global bypass privileges across all organizations and telemetry nodes." : 
                                    " This identity is restricted to its assigned organization and telemetry nodes."}
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Account Management</p>
                            <div className="flex items-center justify-between p-6 rounded-2xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all group">
                                <div className="space-y-1">
                                    <h5 className="text-sm font-bold text-destructive uppercase tracking-tight">Terminate Identity</h5>
                                    <p className="text-xs text-muted-foreground/60 italic font-medium">Permanently revoke all access and archive this identity manifest.</p>
                                </div>
                                <Button variant="destructive" className="font-black uppercase tracking-[0.2em] text-[10px] h-10 px-6 shadow-xl shadow-destructive/20 group-hover:scale-105 transition-all">Revoke Access</Button>
                            </div>
                        </div>
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
