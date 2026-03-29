"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Truck } from "lucide-react"

interface BreakdownItem {
  name?: string;
  country?: string;
  count: number;
}

interface CarrierRegionalBreakdownProps {
  carriers: BreakdownItem[];
  regions: BreakdownItem[];
}

export function CarrierCard({ carriers }: { carriers: BreakdownItem[] }) {
  const maxCarrier = Math.max(...carriers.map(c => c.count), 1);
  return (
    <Card className="border-border/40 bg-card/20 backdrop-blur-md rounded-2xl flex flex-col h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-primary" />
          <CardTitle className="text-sm font-bold tracking-tight italic uppercase">CARRIERS</CardTitle>
        </div>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Volume Distribution</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {carriers.map((carrier, i) => (
          <div key={i} className="space-y-1.5 px-4 py-3 bg-white/5 rounded-xl border border-white/5 transition-all duration-300 hover:bg-white/10 hover:border-white/10 group/item">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tracking-widest uppercase opacity-70 italic group-hover/item:opacity-100 transition-opacity">{carrier.name}</span>
              <span className="font-mono font-black text-primary font-display">{carrier.count}</span>
            </div>
            <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out group-hover/item:brightness-125"
                style={{ 
                  width: `${(carrier.count / maxCarrier) * 100}%`,
                  backgroundColor: `var(--chart-${(i % 5) + 1})`,
                  backgroundImage: `linear-gradient(to right, transparent, rgba(255,255,255,0.3))`,
                  boxShadow: `0 0 15px -2px var(--chart-${(i % 5) + 1})`
                }}
              />
            </div>
          </div>
        ))}
        {carriers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 opacity-20">
            <Truck className="size-10 stroke-[1px]" />
            <p className="text-[10px] uppercase font-bold tracking-widest mt-2">No Active Logistics</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function RegionCard({ regions }: { regions: BreakdownItem[] }) {
  const maxRegion = Math.max(...regions.map(r => r.count), 1);
  return (
    <Card className="border-border/40 bg-card/20 backdrop-blur-md rounded-2xl flex flex-col h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          <CardTitle className="text-sm font-bold tracking-tight italic uppercase">REGIONS</CardTitle>
        </div>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Origin Mapping</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {regions.map((region, i) => (
          <div key={i} className="space-y-1.5 px-4 py-3 bg-white/5 rounded-xl border border-white/5 transition-all duration-300 hover:bg-white/10 hover:border-white/10 group/item">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tracking-widest uppercase opacity-70 italic group-hover/item:opacity-100 transition-opacity">{region.country}</span>
              <span className="font-mono font-black text-primary font-display">{region.count}</span>
            </div>
            <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out group-hover/item:brightness-125"
                style={{ 
                  width: `${(region.count / maxRegion) * 100}%`,
                  backgroundColor: `var(--chart-${4 - (i % 5)})`, // Different color sequence
                  backgroundImage: `linear-gradient(to right, transparent, rgba(255,255,255,0.3))`,
                  boxShadow: `0 0 15px -2px var(--chart-${4 - (i % 5)})`
                }}
              />
            </div>
          </div>
        ))}
        {regions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 opacity-20">
            <Globe className="size-10 stroke-[1px]" />
            <p className="text-[10px] uppercase font-bold tracking-widest mt-2">No Global Operations</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CarrierRegionalBreakdown({ carriers, regions }: CarrierRegionalBreakdownProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 h-full">
       <CarrierCard carriers={carriers} />
       <RegionCard regions={regions} />
    </div>
  )
}
