/** @format */

'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { DataTable } from '@/components/quotes/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { useOrg } from '@/components/providers/org-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/sparkline';

export default function QuotesPage() {
  const { activeOrgId, sessionId } = useOrg();

  const quotes = useQuery(
    api.quotes.listQuotes,
    activeOrgId ? { orgId: activeOrgId, sessionId } : 'skip'
  );

  const stats = useQuery(
    api.quotes.getAdminStats,
    activeOrgId ? { orgId: activeOrgId, sessionId } : 'skip'
  );

  const isLoading = quotes === undefined;

  return (
    <div className='flex-1 flex flex-col gap-6 px-6 py-2 lg:p-10'>
      {/* Header Section */}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-bold tracking-tight text-foreground'>
            Quote Requests
          </h1>
          <div className='flex items-center gap-2'>
            <p className='text-muted-foreground'>
              Manage and approve shipping quote requests from your customers.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section (Enhanced) */}
      {stats && stats.success && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
           {[
             { title: "Total Quotes", value: stats.totalQuotes, chart: stats.sparklines?.total, color: "hsl(var(--primary))", description: "All requests" },
             { title: "Pending", value: stats.pendingQuotes, chart: stats.sparklines?.pending, color: "var(--chart-4)", description: "Awaiting review" },
             { title: "Reviewing", value: (stats as any).reviewingQuotes || 0, chart: stats.sparklines?.total, color: "var(--chart-3)", description: "In process" },
             { title: "Rejected", value: (stats as any).rejectedQuotes || 0, chart: stats.sparklines?.rejected, color: "var(--chart-1)", description: "Not approved" },
             { 
               title: "Revenue", 
               value: new Intl.NumberFormat(stats.currency === "INR" ? "en-IN" : "en-LK", {
                  style: "currency",
                  currency: stats.currency,
                  currencyDisplay: "narrowSymbol",
                  maximumFractionDigits: 0
               }).format(stats.revenue), 
               chart: stats.sparklines?.revenue, 
               color: "var(--chart-2)", 
               description: "Approved value" 
             },
           ].map((item, idx) => (
             <Card 
               key={idx} 
               className="relative border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/40 transition-all duration-500 overflow-hidden group"
             >
               {/* Spotlight Glows */}
               <div className="absolute -right-20 -top-20 size-48 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
               <div className="absolute -left-20 -bottom-20 size-32 bg-indigo-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
               
               <CardContent className="p-4 relative z-10">
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40 mb-1">{item.title}</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-black tabular-nums tracking-tighter">{item.value}</h3>
                    <div className="w-16 h-8 mb-1 opacity-20 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110">
                       {item.chart && item.chart.length > 0 && (
                          <Sparkline data={item.chart} color={item.color} />
                       )}
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-tight opacity-60 group-hover:opacity-100 transition-opacity">{item.description}</p>
               </CardContent>
             </Card>
           ))}
        </div>
      )}

      {/* Main Content */}
      <Card className='border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-xl overflow-hidden'>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full animate-pulse bg-muted/20" />
              <Skeleton className="h-64 w-full animate-pulse bg-muted/10" />
            </div>
          ) : (
            <DataTable 
              data={quotes || []} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
