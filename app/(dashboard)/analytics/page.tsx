/** @format */

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
  Cell,
  Label, 
  Pie, 
  PieChart, 
  XAxis, 
  YAxis 
} from "recharts";
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  IndianRupee,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  Layers
} from "lucide-react";
import * as React from "react";
import { Sparkline } from "@/components/sparkline";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
  
  const analyticsResult = useQuery(api.analytics.getAnalytics, 
    activeOrgId ? { orgId: activeOrgId, sessionId, timeRange } : "skip"
  );
  
  const analytics = analyticsResult as any;

  if (!isAuthLoaded || analytics === undefined) {
    return (
      <div className="flex flex-col gap-6 px-6 py-2 lg:p-10 bg-background min-h-screen">
        <div className="flex justify-between items-center mt-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-4 w-[400px]" />
          </div>
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[140px]" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (analytics.success === false) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-destructive">Error loading analytics</h2>
        <p className="text-muted-foreground">{analytics.error}</p>
      </div>
    );
  }

  const { metrics, changes, statusDistribution, shipmentTrends, carrierUsage, originDistribution, sparklines } = analytics;

  const renderTrendBadge = (value: number) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <Badge variant={isPositive ? "outline" : "outline"} className={`ml-2 flex items-center gap-1 border-none ${isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"}`}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(value).toFixed(1)}%
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-2 lg:p-10 bg-background min-h-screen selection:bg-primary/20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Advanced Analytics
            </h2>
            <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] tracking-widest px-2">Pro</Badge>
          </div>
          <p className="text-muted-foreground font-medium">
            Strategic telemetry and operational efficiency insights.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-xl border border-border/40">
           <Calendar size={14} className="ml-2 text-muted-foreground" />
           <Select value={timeRange} onValueChange={(val: any) => setTimeRange(val)}>
              <SelectTrigger className="w-[140px] border-none bg-transparent font-bold focus:ring-0">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                <SelectItem value="7d" className="font-bold">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="font-bold">Last 30 Days</SelectItem>
                <SelectItem value="90d" className="font-bold">Last 90 Days</SelectItem>
                <SelectItem value="all" className="font-bold">All Time</SelectItem>
              </SelectContent>
           </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-muted/30 p-1 rounded-xl border border-border/40 w-fit h-auto flex gap-1">
          <TabsTrigger value="overview" className="rounded-lg font-black uppercase tracking-widest text-[10px] px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-lg font-black uppercase tracking-widest text-[10px] px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">
            Performance
          </TabsTrigger>
          <TabsTrigger value="financials" className="rounded-lg font-black uppercase tracking-widest text-[10px] px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">
            Financials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/40 transition-all duration-500 group">
              <div className="absolute -right-16 -top-16 size-48 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume</CardTitle>
                <Package className="w-4 h-4 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="text-4xl font-black tracking-tighter">{metrics.totalShipments}</div>
                  {renderTrendBadge(changes.total)}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-wider">Shipments this period</p>
                <div className="mt-6 group-hover:scale-105 transition-transform duration-500">
                  <Sparkline data={sparklines.total} color="var(--primary)" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 hover:border-emerald-500/40 transition-all duration-500 group">
              <div className="absolute -right-16 -top-16 size-48 bg-emerald-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Success Rate</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-30 group-hover:opacity-100 transition-opacity" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="text-4xl font-black tracking-tighter">
                    {metrics.totalShipments > 0 ? Math.round((metrics.deliveredCount / metrics.totalShipments) * 100) : 0}%
                  </div>
                  {renderTrendBadge(changes.delivered)}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-wider">Completed deliveries</p>
                <div className="mt-6 group-hover:scale-105 transition-transform duration-500">
                  <Sparkline data={sparklines.delivered} color="var(--chart-2)" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 hover:border-blue-500/40 transition-all duration-500 group">
              <div className="absolute -right-16 -top-16 size-48 bg-blue-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lead Time</CardTitle>
                <Clock className="w-4 h-4 text-blue-500 opacity-30 group-hover:opacity-100 transition-opacity" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="text-4xl font-black tracking-tighter">{metrics.avgDeliveryTimeDays.toFixed(1)} <span className="text-base lowercase font-bold text-muted-foreground">days</span></div>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-wider">Average transit time</p>
                <div className="mt-6 flex h-8 items-end gap-1 group-hover:scale-105 transition-transform duration-500">
                   {Array.from({length: 7}).map((_, i) => (
                      <div key={i} className="flex-1 bg-blue-500/20 rounded-[2px]" style={{ height: `${20 + Math.random() * 80}%` }} />
                   ))}
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:shadow-rose-500/10 hover:-translate-y-2 hover:border-rose-500/40 transition-all duration-500 group">
              <div className="absolute -right-16 -top-16 size-48 bg-rose-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exceptions</CardTitle>
                <AlertCircle className="w-4 h-4 text-rose-500 opacity-30 group-hover:opacity-100 transition-opacity" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="text-4xl font-black tracking-tighter">{metrics.exceptionCount}</div>
                  {renderTrendBadge(changes.exceptions)}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-wider">Failed or alerts triggered</p>
                <div className="mt-6 flex h-8 items-end gap-1 group-hover:scale-105 transition-transform duration-500">
                    {Array.from({length: 7}).map((_, i) => (
                      <div key={i} className="flex-1 bg-rose-500/20 rounded-[2px]" style={{ height: `${Math.random() * 40}%` }} />
                   ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Shipment Trends */}
            <div className="lg:col-span-4">
               <ChartAreaInteractive 
                  data={shipmentTrends} 
                  title="Operational Velocity" 
                  description="System-wide throughput telemetry"
               />
            </div>

            {/* Status Distribution */}
            <Card className="lg:col-span-3 border-border/40 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-black tracking-tight uppercase">Status Allocation</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-wider opacity-60">System-wide distribution</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center p-0">
                <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-h-[350px]">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="rounded-xl font-bold" />} />
                    <Pie
                      data={statusDistribution}
                      dataKey="count"
                      nameKey="status"
                      innerRadius="65%"
                      outerRadius="85%"
                      paddingAngle={5}
                      strokeWidth={2}
                      stroke="rgba(0,0,0,0.2)"
                    >
                      {statusDistribution.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill} 
                          className="hover:opacity-80 transition-opacity cursor-pointer" 
                          style={{
                            filter: `drop-shadow(0 0 8px ${entry.fill}66)`
                          }}
                        />
                      ))}
                      <Label
                        content={({ viewBox }: any) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-foreground text-5xl font-black tracking-tighter"
                                >
                                  {metrics.totalShipments}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 28}
                                  className="fill-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]"
                                >
                                  Units Trace
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
              <div className="p-6 pt-0 flex flex-wrap justify-center gap-4 border-t border-border/10">
                  {statusDistribution.map((item: any) => (
                    <div key={item.status} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{item.status}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-black tracking-tight uppercase">Carrier Efficiency</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-wider opacity-60">Top 5 most used carriers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                            <BarChart data={carrierUsage} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid horizontal={false} strokeDasharray="5 5" stroke="var(--border)" opacity={0.3} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
                                />
                                <XAxis type="number" hide />
                                <ChartTooltip content={<ChartTooltipContent hideLabel className="rounded-xl font-bold" />} />
                                <Bar 
                                    dataKey="count" 
                                    fill="var(--primary)" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={32}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-black tracking-tight uppercase">Market Origins</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-wider opacity-60">Shipment source distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                            <BarChart data={originDistribution} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid horizontal={false} strokeDasharray="5 5" stroke="var(--border)" opacity={0.3} />
                                <YAxis
                                    dataKey="country"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
                                />
                                <XAxis type="number" hide />
                                <ChartTooltip content={<ChartTooltipContent hideLabel className="rounded-xl font-bold" />} />
                                <Bar 
                                    dataKey="count" 
                                    fill="var(--chart-2)" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={32}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
             </div>
        </TabsContent>

        <TabsContent value="financials" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-black tracking-tight uppercase">Revenue Stream</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-40">Financial metrics from approved quotes</CardDescription>
                </div>
                <IndianRupee className="text-amber-500/40 h-8 w-8" />
            </CardHeader>
            <CardContent className="space-y-12 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Total Gross</span>
                        <div className="flex items-center gap-4">
                            <h3 className="text-5xl font-black tracking-tighter tabular-nums text-amber-500">
                                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(metrics.totalRevenue)}
                            </h3>
                            {renderTrendBadge(metrics.revenueChange || 0)}
                        </div>
                    </div>
                    <div className="flex flex-col justify-end">
                         <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 w-[65%] rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
                         </div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-2 text-right">Target reaching: 65% of Q1 forecast</p>
                    </div>
                </div>
                
                <div className="px-2">
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <AreaChart 
                            data={shipmentTrends}
                            margin={{ left: 12, right: 12, top: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                                dataKey="date" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={12}
                                className="font-bold uppercase tracking-widest text-muted-foreground/40"
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <ChartTooltip 
                                indicator="dot"
                                content={<ChartTooltipContent className="rounded-xl border-border/40 shadow-2xl font-bold" />} 
                            />
                            <Area 
                                type="natural" 
                                dataKey="revenue" 
                                stroke="var(--chart-4)" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorRevenue)" 
                                connectNulls
                                animationDuration={2500}
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
