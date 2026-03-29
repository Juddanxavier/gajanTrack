"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/auth/client";
import { useOrg } from "@/components/providers/org-provider";

import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { CarrierCard, RegionCard } from "@/components/dashboard/carrier-regional-breakdown";
import { ActionBar } from "@/components/dashboard/action-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { 
  ArrowUpRight,
  Package,
  LayoutDashboard,
  Clock,
  RefreshCw,
  Plus,
  Activity
} from "lucide-react";

export default function Home() {
  const { isLoaded: isAuthLoaded } = useCurrentUser();
  const { activeOrgId, sessionId } = useOrg();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d" | "all">("30d");
  
  const analytics = useQuery(api.analytics.getAnalytics, 
    activeOrgId ? { orgId: activeOrgId, sessionId, timeRange } : "skip"
  );
  const recentQuotes = useQuery(api.quotes.getRecentQuotes, 
    activeOrgId ? { orgId: activeOrgId, sessionId } : "skip"
  );

  if (!isAuthLoaded || analytics === undefined) {
    return (
      <div className='flex flex-col gap-8 p-6 lg:p-10 max-w-[1600px] mx-auto'>
        <div className='flex justify-between items-center'>
          <div className='space-y-4'>
            <Skeleton className='h-4 w-[150px]' />
            <Skeleton className='h-12 w-[300px]' />
          </div>
          <Skeleton className='h-10 w-[120px] rounded-full' />
        </div>
        <div className='grid gap-6 md:grid-cols-3 lg:grid-cols-5'>
          <Skeleton className='h-[160px] rounded-2xl' />
          <Skeleton className='h-[160px] rounded-2xl' />
          <Skeleton className='h-[160px] rounded-2xl' />
          <Skeleton className='h-[160px] rounded-2xl' />
          <Skeleton className='h-[160px] rounded-2xl' />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className='h-[450px] lg:col-span-8 rounded-2xl' />
          <Skeleton className='h-[450px] lg:col-span-4 rounded-2xl' />
        </div>
      </div>
    );
  }

  if (analytics.success === false) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center space-y-6">
        <div className="size-20 rounded-full bg-destructive/5 flex items-center justify-center text-destructive border border-destructive/10 animate-pulse">
          <RefreshCw className="size-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tighter font-display italic">SYSTEM OUTAGE</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            {analytics.error || "Logistics intelligence aggregation failure detected."}
          </p>
        </div>
        <Button onClick={() => window.location.reload()} size="lg" className="rounded-full px-8 font-bold tracking-widest text-xs">
          FORCED RECONNECT
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen font-display">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -z-10 opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 opacity-10 pointer-events-none" />

      {/* Header Section */}
      <ActionBar 
        timeRange={timeRange} 
        setTimeRange={setTimeRange} 
        onRefresh={() => window.location.reload()}
      />

      {/* Metric Cards Row */}
      <SectionCards data={analytics as any} currency={(analytics.metrics as any)?.currency || "INR"} />

      {/* Main Bento Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Core Trends Chart */}
        <div className="lg:col-span-8 h-full">
          <ChartAreaInteractive 
            data={analytics.shipmentTrends as any} 
            title="Operational Velocity"
            description={`Throughput visualization for the selected ${timeRange} window`}
            isLoading={analytics === undefined}
          />
        </div>

        {/* Status Distribution (Top Right) */}
        <div className="lg:col-span-4 h-full">
          <StatusDistribution data={analytics.statusDistribution as any} />
        </div>

        {/* Mid Row Breakdown */}
        <div className="lg:col-span-6">
           <CarrierCard carriers={analytics.carrierUsage as any} />
        </div>
        <div className="lg:col-span-6">
           <RegionCard regions={analytics.originDistribution as any} />
        </div>

        {/* Live Feed - Full Width */}
        <Card className="lg:col-span-12 border-border/40 bg-card/40 backdrop-blur-2xl rounded-xl overflow-hidden shadow-2xl shadow-primary/5">
          <CardHeader className="flex flex-row items-center border-b border-border/40 py-5">
            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <CardTitle className="text-xl font-bold tracking-tight">Recent Activity</CardTitle>
              </div>
              <CardDescription className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                Latest quote requests & updates
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="ml-auto rounded-full px-4 text-xs font-bold hover:bg-primary/5 hover:text-primary transition-all">
              <Link href="/quotes">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {recentQuotes?.map((quote) => {
                const q = quote as any;
                const initials = q._id.slice(-2).toUpperCase();
                return (
                  <div key={q._id} className="group flex items-center gap-4 p-4 transition-colors hover:bg-white/5">
                    <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
                      <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black font-mono">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5 flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">
                        {q.origin.city} <span className="text-primary/30 mx-1 font-mono">→</span> {q.destination.city}
                      </p>
                      <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest truncate">
                        {q.parcelDetails.description || "Active Unit"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right shrink-0">
                      <p className="text-sm font-black tracking-tight font-mono text-primary">
                        {q.estimatedPrice ? 
                          new Intl.NumberFormat((analytics.metrics as any).currency === "INR" ? "en-IN" : "en-LK", {
                            style: "currency",
                            currency: (analytics.metrics as any).currency || "INR",
                            currencyDisplay: "narrowSymbol",
                            maximumFractionDigits: 0
                          }).format(q.estimatedPrice)
                          : "---"}
                      </p>
                      <Badge 
                        variant="outline" 
                        className="text-[9px] uppercase px-2 py-0 font-black bg-primary/5 border-primary/10 text-primary"
                      >
                        {q.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="py-4 border-t border-border/40 bg-muted/5 min-h-[60px] flex items-center justify-center">
             <div className="w-full flex items-center justify-center gap-3 shrink-0">
               <span className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.3em] font-mono">SECURE OPERATIONS UPLINK ACTIVE</span>
             </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
