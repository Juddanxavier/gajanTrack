"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { useCurrentUser } from "@/lib/auth/client";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis 
} from "recharts";
import { 
  Plus,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Zap,
  IndianRupee,
  ShieldCheck
} from "lucide-react";
import * as React from "react";
import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { CarrierCard, RegionCard } from "@/components/dashboard/carrier-regional-breakdown";
import { ActionBar } from "@/components/dashboard/action-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const chartConfig = {
  count: {
    label: "Shipments",
    color: "hsl(var(--primary))",
  },
  delivered: {
    label: "Delivered",
    color: "var(--chart-2)",
  },
  inTransit: {
    label: "In Transit",
    color: "var(--chart-3)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-4)",
  },
  exception: {
    label: "Exception",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const { activeOrgId, sessionId } = useOrg();
  const { isLoaded: isAuthLoaded } = useCurrentUser();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d" | "all">("30d");
  
  const analyticsResult = useQuery(api.analytics.queries.getAnalytics, 
    activeOrgId ? { orgId: activeOrgId, sessionId, timeRange } : "skip"
  );
  
  const analytics = analyticsResult as any;

  if (!isAuthLoaded || analytics === undefined) {
    return (
      <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen">
        <div className="flex justify-between items-center">
          <div className="space-y-4">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-12 w-[300px]" />
          </div>
          <Skeleton className="h-10 w-[150px] rounded-full" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[160px] rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
            <Skeleton className="h-[500px] lg:col-span-8 rounded-2xl" />
            <Skeleton className="h-[500px] lg:col-span-4 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (analytics.success === false) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center space-y-6">
        <div className="size-20 rounded-full bg-destructive/5 flex items-center justify-center text-destructive border border-destructive/10 animate-pulse">
          <Zap className="size-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tighter uppercase">SIGNAL LOST</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            {analytics.error || "Tactical analytics uplink failed. Re-encryption required."}
          </p>
        </div>
        <Button onClick={() => window.location.reload()} size="lg" className="rounded-full px-8 font-bold tracking-widest text-xs">
          FORCE RETRANSMIT
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen selection:bg-primary/20">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -z-10 opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 opacity-10 pointer-events-none" />

      {/* Strategic Header */}
      <ActionBar 
        timeRange={timeRange} 
        setTimeRange={setTimeRange} 
        onRefresh={() => window.location.reload()}
        title="Strategic Analytics"
        subtitle={`Advanced Telemetry • ${analytics.metrics?.totalShipments || 0} Unified Units`}
      />

      <Tabs defaultValue="overview" className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <TabsList className="bg-muted/30 p-1 rounded-xl border border-border/40 w-fit h-auto flex gap-1 backdrop-blur-md">
                <TabsTrigger value="overview" className="rounded-lg font-bold uppercase tracking-widest text-[10px] px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">
                    Overview
                </TabsTrigger>
                <TabsTrigger value="performance" className="rounded-lg font-bold uppercase tracking-widest text-[10px] px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">
                    Performance
                </TabsTrigger>
                <TabsTrigger value="financials" className="rounded-lg font-bold uppercase tracking-widest text-[10px] px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">
                    Financials
                </TabsTrigger>
            </TabsList>
            
            <Badge variant="outline" className="rounded-full px-4 py-1.5 border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-tighter flex gap-2 items-center">
                <ShieldCheck className="size-3" />
                SECURE DATA STREAM ACTIVE
            </Badge>
        </div>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Top Metric Cards */}
          <SectionCards data={analytics} currency={analytics.metrics?.currency || "INR"} />

          {/* Core Insights Bento Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Primary Capacity Velocity */}
            <div className="lg:col-span-8 h-full">
              <ChartAreaInteractive 
                data={analytics.shipmentTrends as any} 
                title="Operational Velocity" 
                description="Tactical throughput telemetry via real-time uplink"
                sparkline={true}
              />
            </div>

            {/* Status Distribution */}
            <div className="lg:col-span-4 h-full">
               <StatusDistribution data={analytics.statusDistribution as any} />
            </div>

            {/* Carrier Usage Breakdown */}
            <div className="lg:col-span-6">
                <CarrierCard carriers={analytics.carrierUsage as any} />
            </div>

            {/* Regional Activity Mapping */}
            <div className="lg:col-span-6">
               <RegionCard regions={analytics.originDistribution as any} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="grid gap-6 lg:grid-cols-12">
                <Card className="lg:col-span-12 border-border/40 bg-card/40 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl">
                    <CardHeader className="flex flex-row items-center border-b border-border/40 py-6">
                        <div className="grid gap-1">
                            <div className="flex items-center gap-2">
                                <Zap className="size-4 text-primary" />
                                <CardTitle className="text-xl font-bold tracking-tight uppercase">System Efficiency</CardTitle>
                            </div>
                            <CardDescription className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                Transit time & success ratios
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid md:grid-cols-3 gap-12">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Mean Transit Time</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-bold tracking-tighter text-primary">{analytics.metrics.avgDeliveryTimeDays.toFixed(1)}</h3>
                                        <span className="text-xl font-bold text-muted-foreground/20">DAYS</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[78%] rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground/30 italic">8% improvement vs previous cycle</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Successful Completion</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-black tracking-tighter italic text-emerald-500">
                                            {analytics.metrics.totalShipments > 0 ? Math.round((analytics.metrics.deliveredCount / analytics.metrics.totalShipments) * 100) : 0}
                                        </h3>
                                        <span className="text-xl font-bold text-muted-foreground/20 italic">%</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[92%] rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground/30 italic">Target threshold: 95.0%</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Operational Pulse</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-bold tracking-tighter text-indigo-500">99.2</h3>
                                        <span className="text-xl font-bold text-muted-foreground/20">SCORE</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[99%] rounded-full shadow-[0_0_15px_rgba(99,102,241,0.3)]" />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground/30 italic">System integrity nominal</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Carrier Performance Comparison */}
                <div className="lg:col-span-12">
                    <Card className="border-border/40 bg-card/20 backdrop-blur-md rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold tracking-tight uppercase">Carrier Performance Matrix</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Volume vs Relative Efficiency</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                                <BarChart data={analytics.carrierUsage}>
                                    <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis 
                                        dataKey="name" 
                                        tickLine={false} 
                                        axisLine={false}
                                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40"
                                    />
                                    <YAxis hide />
                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Bar 
                                        dataKey="count" 
                                        fill="var(--primary)" 
                                        radius={[8, 8, 0, 0]}
                                        barSize={40}
                                        animationDuration={2000}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
             </div>
        </TabsContent>

        <TabsContent value="financials" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between py-10 px-10">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight uppercase">Revenue Stream Alpha</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Tactical monetary intelligence</CardDescription>
                    </div>
                    <div className="size-16 rounded-3xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-2xl shadow-amber-500/20">
                        <IndianRupee className="text-amber-500 size-8" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-16 pb-16 px-10">
                    <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/20">Unified Gross Assets</span>
                            <div className="flex items-center gap-6">
                                <h3 className="text-4xl font-bold tracking-tighter tabular-nums text-foreground">
                                    {new Intl.NumberFormat(analytics.metrics.currency === "INR" ? "en-IN" : "en-LK", { 
                                        style: "currency", 
                                        currency: analytics.metrics.currency, 
                                        maximumFractionDigits: 0,
                                        currencyDisplay: "narrowSymbol"
                                    }).format(analytics.metrics.totalRevenue)}
                                </h3>
                                <div className={`flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${analytics.changes.revenue >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    <ArrowUpRight className="size-4" />
                                    {Math.abs(analytics.changes.revenue).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col justify-end space-y-4">
                             <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-[65%] rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                             </div>
                             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                                <span>Quarterly Target Progression</span>
                                <span>65.0% Achieved</span>
                             </div>
                        </div>
                    </div>

                    <div className="h-[400px] w-full bg-white/5 rounded-3xl border border-white/5 p-8 relative group">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <AreaChart data={analytics.shipmentTrends} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenueAlpha" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                                <XAxis 
                                    dataKey="date" 
                                    hide 
                                />
                                <YAxis hide />
                                <ChartTooltip content={<ChartTooltipContent indicator="line" className="rounded-xl border-border/40 shadow-2xl font-bold" />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="var(--chart-4)" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorRevenueAlpha)" 
                                    animationDuration={3000}
                                />
                            </AreaChart>
                        </ChartContainer>
                        <div className="absolute inset-x-8 bottom-8 flex justify-between items-center pointer-events-none">
                            <span className="text-[10px] font-black text-muted-foreground/10 uppercase tracking-[0.5em]">FINANCIAL_STREAM_XDR_04</span>
                            <TrendingUp className="size-4 text-primary animate-pulse" />
                        </div>
                    </div>
                </CardContent>
             </Card>
        </TabsContent>
      </Tabs>
      
      {/* Footer System Status */}
      <div className="mt-12 py-8 border-t border-border/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/20 italic">
            <span>UPLINK_01_ACTIVE</span>
            <div className="size-1 rounded-full bg-primary" />
            <span>ENCRYPTED_FEED</span>
            <div className="size-1 rounded-full bg-primary" />
            <span>GAVIN_OS_CORE</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/10 italic">
            © 2026 GajanTrack Strategic Systems
        </div>
      </div>
    </div>
  );
}
