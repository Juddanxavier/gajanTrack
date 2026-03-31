import { TrendingUpIcon, Package, Truck, CheckCircle2, MapPin, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Sparkline } from "@/components/sparkline"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

interface ShipmentStatsProps {
  orgId: string;
  userId?: string;
  sessionId?: string;
}

export function ShipmentStats({ orgId, userId, sessionId }: ShipmentStatsProps) {
  const stats = useQuery(api.shipments.queries.getShipmentStats, { 
    orgId, 
    userId: userId || undefined, 
    sessionId: sessionId || undefined 
  });
  const isLoading = stats === undefined;

  const items = [
    {
      title: "Active Shipments",
      value: stats?.total?.toString() || "0",
      description: "Total tracked manifests",
      icon: Package,
      trend: "Monitoring",
      trendIcon: TrendingUpIcon,
      chart: stats?.sparklines?.total || [],
      color: "hsl(var(--primary))"
    },
    {
      title: "In Transit",
      value: stats?.in_transit?.toString() || "0",
      description: "Moving through network",
      icon: Truck,
      trend: "En route",
      trendIcon: TrendingUpIcon,
      chart: stats?.sparklines?.in_transit || [],
      color: "var(--chart-3)"
    },
    {
      title: "Out for Delivery",
      value: stats?.out_for_delivery?.toString() || "0",
      description: "Local hub transit",
      icon: MapPin,
      trend: "Final stage",
      trendIcon: Clock,
      chart: stats?.sparklines?.out_for_delivery || [],
      color: "var(--chart-4)"
    },
    {
      title: "Delivered",
      value: stats?.delivered?.toString() || "0",
      description: "Successfully reached",
      icon: CheckCircle2,
      trend: "Completed",
      trendIcon: TrendingUpIcon,
      chart: stats?.sparklines?.delivered || [],
      color: "var(--chart-2)"
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <Card 
          key={index} 
          className={`relative border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/40 transition-all duration-500 overflow-hidden group ${isLoading ? "animate-pulse" : ""}`}
        >
          {/* Spotlight Glows */}
          <div className="absolute -right-20 -top-20 size-48 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 size-32 bg-indigo-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          
          <CardHeader className="relative pb-2 z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              {item.title}
            </CardDescription>
            <div className="flex items-end justify-between">
              <CardTitle className="text-3xl font-black tabular-nums tracking-tighter">
                {isLoading ? "---" : item.value}
              </CardTitle>
              <div className="w-16 h-8 mb-1 opacity-20 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110">
                 {!isLoading && item.chart.length > 0 && (
                    <Sparkline data={item.chart} color={item.color} />
                 )}
              </div>
            </div>
            <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 pt-0 relative z-10">
            <div className="flex items-center gap-1.5 w-full">
              <Badge variant="outline" className="px-1.5 py-0 text-[8px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
                {item.trend}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity">{item.description}</span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

