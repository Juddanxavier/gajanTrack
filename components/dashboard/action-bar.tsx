"use client"

import React from "react"
import Link from "next/link"
import { Plus, Clock, RefreshCw, ClipboardList, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ActionBarProps {
  timeRange: "7d" | "30d" | "90d" | "all"
  setTimeRange: (value: "7d" | "30d" | "90d" | "all") => void
  onRefresh?: () => void
}

export function ActionBar({ timeRange, setTimeRange, onRefresh }: ActionBarProps) {
  return (
    <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-6 mb-2 bg-card/40 backdrop-blur-3xl border border-border/40 rounded-2xl shadow-xl shadow-primary/5 transition-all duration-300">
      {/* Title Section */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Operational Overview
        </h1>
        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40">
          Real-time intelligence • {timeRange.toUpperCase()} cycle
        </p>
      </div>

      {/* Action Section */}
      <div className="flex items-center gap-3 group">
        <div className="flex items-center bg-background/40 p-1 rounded-xl border border-border/20 backdrop-blur-md">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[140px] border-none bg-transparent hover:bg-white/5 transition-colors font-bold text-[10px] uppercase tracking-widest h-8 rounded-lg">
              <Clock className="size-3.5 mr-2 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40 bg-card/95 backdrop-blur-xl">
              <SelectItem value="7d" className="text-[10px] font-bold tracking-widest uppercase">7 Days Cycle</SelectItem>
              <SelectItem value="30d" className="text-[10px] font-bold tracking-widest uppercase">30 Days Cycle</SelectItem>
              <SelectItem value="90d" className="text-[10px] font-bold tracking-widest uppercase">90 Days Cycle</SelectItem>
              <SelectItem value="all" className="text-[10px] font-bold tracking-widest uppercase">Lifetime Log</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-4 w-px bg-border/20 mx-1" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onRefresh}
                  className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-300 active:scale-95"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-lg border-border/40 bg-card/95 backdrop-blur-xl text-[10px] font-bold uppercase tracking-widest">
                Refresh Intel
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="h-8 w-px bg-border/40 mx-1" />

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="hidden lg:flex rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 h-10 hover:bg-white/5 transition-all duration-300">
             <Link href="/quotes">
               <ClipboardList className="size-4 mr-2 text-muted-foreground" />
               Quotes
             </Link>
          </Button>
          
          <Button asChild variant="ghost" size="sm" className="hidden lg:flex rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 h-10 hover:bg-white/5 transition-all duration-300">
             <Link href="/dashboard/users">
               <Users className="size-4 mr-2 text-muted-foreground" />
               Users
             </Link>
          </Button>
        </div>

        <Button asChild size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300">
           <Link href="/shipments">
             <Plus className="size-4 mr-2" />
             New Shipment
           </Link>
        </Button>
      </div>
    </div>
  )
}
