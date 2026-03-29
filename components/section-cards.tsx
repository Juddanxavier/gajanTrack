"use client";

import { Package, CheckCircle2, Banknote, AlertTriangle, ArrowUpIcon, ArrowDownIcon, Clock, Activity } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Sparkline } from "@/components/sparkline"

interface SectionCardsProps {
  data?: {
    metrics: {
      totalShipments: number;
      deliveredCount: number;
      inTransitCount: number;
      exceptionCount: number;
      totalRevenue: number;
      avgDeliveryTimeDays: number;
    };
    changes: {
      total: number;
      delivered: number;
      revenue: number;
      exceptions: number;
    };
    sparklines: {
      total: { count: number }[];
      delivered: { count: number }[];
      revenue: { count: number }[];
    };
  } | null;
  currency?: string;
}

export function SectionCards({ data, currency = "INR" }: SectionCardsProps) {
  const isLoading = data === undefined;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-LK", {
      style: "currency",
      currency: currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const items = [
    {
      title: "Revenue",
      value: data?.metrics.totalRevenue !== undefined ? formatCurrency(data.metrics.totalRevenue) : formatCurrency(0),
      description: "Approved value",
      icon: Banknote,
      change: data?.changes.revenue ?? 0,
      sparkline: data?.sparklines.revenue ?? [],
      color: "var(--chart-2)",
    },
    {
      title: "Active Units",
      value: data?.metrics.totalShipments?.toString() || "0",
      description: "Volume Overview",
      icon: Package,
      change: data?.changes.total ?? 0,
      sparkline: data?.sparklines.total ?? [],
      color: "hsl(var(--primary))",
    },
    {
      title: "Completed",
      value: data?.metrics.deliveredCount?.toString() || "0",
      description: "Success Rate",
      icon: CheckCircle2,
      change: data?.changes.delivered ?? 0,
      sparkline: data?.sparklines.delivered ?? [],
      color: "var(--chart-3)",
    },
    {
      title: "System Pulse",
      value: "98.4%",
      description: "All uplinks active",
      icon: Activity,
      isPulse: true,
      color: "var(--primary)",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item: any, index) => (
        <Card 
          key={index} 
          className={`relative border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/40 transition-all duration-500 overflow-hidden group ${item.isPulse ? 'bg-primary/5' : ''}`}
        >
          {/* Spotlight Glows */}
          <div className="absolute -right-20 -top-20 size-48 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 size-48 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          
          <CardHeader className="p-4 flex flex-col space-y-0 relative z-10 h-full justify-between">
             <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40 mb-1">{item.title}</p>
                <div className="flex items-end justify-between">
                    <CardTitle className={`text-3xl font-black tabular-nums tracking-tighter ${item.isPulse ? 'text-primary italic' : ''}`}>
                      {isLoading ? "---" : item.value}
                    </CardTitle>
                    {!item.isPulse && (
                       <div className="w-16 h-8 mb-1 opacity-20 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110">
                          {!isLoading && item.sparkline && item.sparkline.length > 0 && (
                             <Sparkline data={item.sparkline} color={item.color} />
                          )}
                       </div>
                    )}
                </div>
             </div>

             <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                    {item.isPulse && <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />}
                    <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tight">{item.description}</p>
                </div>
                {!isLoading && !item.isPulse && (
                  <div className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${item.change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {item.change >= 0 ? <ArrowUpIcon className="size-2.5" /> : <ArrowDownIcon className="size-2.5" />}
                    {Math.abs(item.change).toFixed(1)}%
                  </div>
                )}
             </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
