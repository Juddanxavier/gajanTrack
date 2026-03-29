"use client";

import * as React from "react";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ReportFiltersProps {
  onFiltersChange: (filters: any) => void;
  reportType: "shipments" | "quotes";
  setReportType: (type: "shipments" | "quotes") => void;
}

export function ReportFilters({ onFiltersChange, reportType, setReportType }: ReportFiltersProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const [status, setStatus] = React.useState<string>("all");
  const [carrier, setCarrier] = React.useState<string>("all");

  const handleReset = () => {
    setDate({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    });
    setStatus("all");
    setCarrier("all");
  };

  React.useEffect(() => {
    onFiltersChange({
      startDate: date?.from?.getTime(),
      endDate: date?.to?.getTime(),
      status: status === "all" ? undefined : status,
      carrier: carrier === "all" ? undefined : carrier,
    });
  }, [date, status, carrier, reportType]);

  return (
    <div className="flex flex-col gap-4 p-6 bg-card/40 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest">Report Parameters</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReset}
          className="h-8 px-2 text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors"
        >
          <X className="w-3 h-3 mr-1" />
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Report Type */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Data Source</label>
          <Select value={reportType} onValueChange={(val: any) => setReportType(val)}>
            <SelectTrigger className="bg-background/50 border-border/40 hover:border-primary/40 transition-colors uppercase font-bold text-xs tracking-wider">
              <SelectValue placeholder="Select Source" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
              <SelectItem value="shipments" className="text-xs font-bold uppercase tracking-wider">Shipments Data</SelectItem>
              <SelectItem value="quotes" className="text-xs font-bold uppercase tracking-wider">Quotes Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Temporal Range</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-bold text-xs uppercase tracking-wider bg-background/50 border-border/40 hover:border-primary/40 transition-colors",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50 text-primary" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-border/40 rounded-xl" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                className="rounded-xl"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Status Classification</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-background/50 border-border/40 hover:border-primary/40 transition-colors uppercase font-bold text-xs tracking-wider">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
              <SelectItem value="all" className="text-xs font-bold uppercase tracking-wider">All Statuses</SelectItem>
              {reportType === "shipments" ? (
                <>
                  <SelectItem value="pending" className="text-xs font-bold uppercase tracking-wider">Pending</SelectItem>
                  <SelectItem value="in_transit" className="text-xs font-bold uppercase tracking-wider">In Transit</SelectItem>
                  <SelectItem value="out_for_delivery" className="text-xs font-bold uppercase tracking-wider">Out for Delivery</SelectItem>
                  <SelectItem value="delivered" className="text-xs font-bold uppercase tracking-wider">Delivered</SelectItem>
                  <SelectItem value="exception" className="text-xs font-bold uppercase tracking-wider">Exception</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="pending" className="text-xs font-bold uppercase tracking-wider">Pending</SelectItem>
                  <SelectItem value="approved" className="text-xs font-bold uppercase tracking-wider">Approved</SelectItem>
                  <SelectItem value="rejected" className="text-xs font-bold uppercase tracking-wider">Rejected</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Filter (Carrier for shipments, or something else) */}
        {reportType === "shipments" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Carrier Network</label>
                <Select value={carrier} onValueChange={setCarrier}>
                    <SelectTrigger className="bg-background/50 border-border/40 hover:border-primary/40 transition-colors uppercase font-bold text-xs tracking-wider">
                        <SelectValue placeholder="All Carriers" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
                        <SelectItem value="all" className="text-xs font-bold uppercase tracking-wider">All Network Partners</SelectItem>
                        <SelectItem value="dhl" className="text-xs font-bold uppercase tracking-wider">DHL Express</SelectItem>
                        <SelectItem value="fedex" className="text-xs font-bold uppercase tracking-wider">FedEx</SelectItem>
                        <SelectItem value="ups" className="text-xs font-bold uppercase tracking-wider">UPS</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        )}
      </div>
    </div>
  );
}
