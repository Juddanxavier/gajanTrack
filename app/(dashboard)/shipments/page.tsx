/** @format */

'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { columns } from '@/components/shipments/columns';
import { ShipmentsDataTable } from '@/components/shipments/data-table';
import { AddShipmentDialog } from '@/components/shipments/add-shipment-dialog';
import { ShipmentStats } from '@/components/shipments/shipment-stats';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { useCurrentUser } from '@/lib/auth/client';
import { useOrg } from '@/components/providers/org-provider';
import { AnalyticsView } from '@/components/shipments/analytics-view';
import { MapView } from '@/components/shipments/map-view';
import { useMutation, useAction } from 'convex/react';
import { toast } from 'sonner';
import { Database, ShieldCheck, RefreshCw, BarChart2, List, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge as UIWebBadge } from '@/components/ui/badge';

export default function ShipmentsPage() {
  const { activeOrgId, sessionId } = useOrg();
  const currentUser = useQuery(api.users.getCurrentUser);

  const shipments = useQuery(
    api.shipments.listShipments,
    activeOrgId
      ? { orgId: activeOrgId, includeArchived: false, sessionId }
      : 'skip',
  );

  const archivedShipments = useQuery(
    api.shipments.listShipments,
    activeOrgId
      ? { orgId: activeOrgId, includeArchived: true, sessionId }
      : 'skip',
  );

  const stats = useQuery(
    api.shipments.getShipmentStats,
    activeOrgId ? { orgId: activeOrgId, sessionId } : 'skip',
  );

  const getQuota = useAction(api.shipments.get17TrackQuota);
  const [quota, setQuota] = React.useState<{total: number, used: number, remaining: number} | null>(null);

  React.useEffect(() => {
    if (!sessionId) return;
    
    // We use a query-like pattern for the action
    const fetchQuota = async () => {
      try {
        const result = await getQuota({ sessionId });
        setQuota(result);
      } catch (err) {
        console.error("Failed to fetch quota:", err);
      }
    };
    fetchQuota();
  }, [sessionId, getQuota]);

  const [activeTab, setActiveTab] = React.useState('all');


  const getFilteredData = () => {
    if (activeTab === 'archived') {
      return (archivedShipments || []).filter((s) => s.archived_at);
    }

    const active = shipments || [];
    if (activeTab === 'all') return active;
    if (activeTab === 'exception') {
      return active.filter(
        (s) => s.status === 'exception' || s.status === 'failed_attempt',
      );
    }
    return active.filter((s) => s.status === activeTab);
  };

  const filteredData = getFilteredData();
  const isLoading =
    activeTab === 'archived'
      ? archivedShipments === undefined
      : shipments === undefined;

  return (
    <div className='flex-1 flex flex-col gap-6 px-6 py-2 lg:p-10'>
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h2 className='text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
            Shipment Center
          </h2>
          <p className='text-muted-foreground'>
            Manage your global logistics and track performance.
          </p>
          {quota && (quota as any).error !== "DISABLED" && (
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">
              <span className="flex items-center gap-1.5 bg-secondary/30 px-2 py-0.5 rounded-full border border-border/40">
                <Database className="h-3 w-3" />
                17track Quota: {!(quota as any).error ? (
                  <>
                    <span className="text-primary">{quota.remaining}</span> / {quota.total} remaining
                  </>
                ) : (
                  <span className="text-rose-500/70">{(quota as any)?.error === "MISSING_KEY" ? "Key Missing" : "Not connected"}</span>
                )}
              </span>
            </div>
          )}
        </div>
        <AddShipmentDialog />
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-background/50 border border-border/40 p-1">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Active List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <Globe className="h-4 w-4" />
            Global Reach
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="outline-none">
          <AnalyticsView orgId={activeOrgId || ""} sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="map" className="outline-none">
          <MapView orgId={activeOrgId || ""} sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="list" className="space-y-6 outline-none">
          <ShipmentStats 
            orgId={activeOrgId || ""} 
            userId={currentUser?.role !== "admin" ? currentUser?.externalId : undefined}
            sessionId={sessionId}
          />

          <div className='flex items-center justify-between gap-4'>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='w-full lg:w-auto'>
              <TabsList className='bg-background/50 border border-border/40 p-1'>
                <TabsTrigger
                  value='all'
                  className='rounded-md px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest'>
                  All Active
                </TabsTrigger>
                <TabsTrigger
                  value='in_transit'
                  className='rounded-md px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest'>
                  Transit
                </TabsTrigger>
                <TabsTrigger
                  value='out_for_delivery'
                  className='rounded-md px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest'>
                  Out for Delivery
                </TabsTrigger>
                <TabsTrigger
                  value='delivered'
                  className='rounded-md px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest'>
                  Delivered
                </TabsTrigger>
                <TabsTrigger
                  value='exception'
                  className='rounded-md px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest text-rose-500 data-[state=active]:text-rose-600'>
                  Exceptions
                </TabsTrigger>
                <div className='h-4 w-px bg-border/40 mx-1 hidden md:block' />
                <TabsTrigger
                  value='archived'
                  className='rounded-md px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest opacity-60 data-[state=active]:opacity-100'>
                  Archive
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className='space-y-6 outline-none'>

            <Card className='border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-xl overflow-hidden'>
              <CardContent className='p-0'>
                <ShipmentsDataTable
                  columns={columns}
                  data={filteredData}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
