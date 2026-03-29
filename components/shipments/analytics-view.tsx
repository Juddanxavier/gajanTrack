'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts';
import { Loader2, TrendingUp, Package, Globe, Truck } from 'lucide-react';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface AnalyticsViewProps {
  orgId: Id<"organizations">;
  sessionId?: string;
}

export function AnalyticsView({ orgId, sessionId }: AnalyticsViewProps) {
  const analytics = useQuery(api.shipments.getDetailedAnalytics, { orgId, sessionId });

  if (analytics === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Synthesizing shipment intelligence...</p>
      </div>
    );
  }

  const { statusData, carrierData, countryData, trendData, totalCount } = analytics;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-primary/5 transition-all duration-500 group">
          <div className="absolute -right-16 -top-16 size-48 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Total Managed</p>
                <p className="text-3xl font-black tracking-tighter tabular-nums">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="lg:col-span-2 border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Operational Velocity
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-40">Monthly Shipment Throughput</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] px-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={12}
                  className="font-bold uppercase tracking-widest text-muted-foreground/40"
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
                <Area 
                    type="natural" 
                    dataKey="value" 
                    stroke="var(--primary)" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Carrier Breakdown */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-black tracking-tight uppercase flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-500" />
              Carrier Allocation
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-40">Market share distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={carrierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="rgba(0,0,0,0.2)"
                >
                  {carrierData.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={[`var(--primary)`, `var(--chart-2)`, `var(--chart-3)`, `var(--chart-4)`, `var(--chart-1)`][index % 5]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                     contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-black tracking-tight uppercase flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-500" />
              Regional Performance
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-40">Volume by origin</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData} layout="vertical" margin={{ left: -20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    width={80}
                    className="font-black uppercase tracking-widest text-muted-foreground/60"
                />
                <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <Bar 
                    dataKey="value" 
                    fill="var(--chart-4)" 
                    radius={[0, 4, 4, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
