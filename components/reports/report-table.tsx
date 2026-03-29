"use client";

import * as React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileDown, FileJson, Package, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReportTableProps {
  data: any[];
  type: "shipments" | "quotes";
  isLoading: boolean;
}

export function ReportTable({ data, type, isLoading }: ReportTableProps) {
  const exportToCSV = () => {
    if (!data.length) return;
    
    const headers = type === "shipments" 
      ? ["Tracking Number", "Status", "Carrier", "Date Created", "Customer"]
      : ["Customer ID", "Status", "Estimated Price", "Origin", "Destination", "Date Created"];
    
    const rows = data.map(item => {
      if (type === "shipments") {
        return [
          item.tracking_number,
          item.status,
          item.carrier_name || item.carrier_code,
          item.created_at_human,
          item.customer_name || "N/A"
        ];
      } else {
        return [
          item.customerId,
          item.status,
          item.estimatedPrice,
          `${item.origin.city}`,
          `${item.destination.city}`,
          item.createdAt_human
        ];
      }
    });

    const csvContent = [headers, ...rows]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${type}_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card/20 backdrop-blur-sm border border-border/40 rounded-2xl animate-pulse">
        <Download className="w-10 h-10 text-primary/20 animate-bounce mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">Synthesizing Report Data...</p>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card/20 backdrop-blur-sm border border-border/40 rounded-2xl">
        <div className="p-4 bg-muted/30 rounded-full mb-4">
             {type === "shipments" ? <Package className="w-8 h-8 text-muted-foreground/40" /> : <Receipt className="w-8 h-8 text-muted-foreground/40" />}
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">No matching records found</p>
        <p className="text-xs font-bold text-muted-foreground/40 mt-1 uppercase tracking-tight text-center max-w-xs">Try adjusting your filters or date range to aggregate more intelligence.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px] py-1 px-3">
                {data.length} MATCHING ENTITIES
            </Badge>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Report generated at {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToCSV}
                className="h-10 bg-background/50 border-border/40 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all font-black uppercase tracking-widest text-[10px] group shadow-xl"
            >
                <FileDown className="w-4 h-4 mr-2 text-emerald-500 group-hover:scale-110 transition-transform" />
                Export CSV
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToJSON}
                className="h-10 bg-background/50 border-border/40 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all font-black uppercase tracking-widest text-[10px] group shadow-xl"
            >
                <FileJson className="w-4 h-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                Export JSON
            </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-2xl overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40">
              {type === "shipments" ? (
                <>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-6">Tracking ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Carrier</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provisioned</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entity</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-6">Reference</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Valuation</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provenance</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => (
              <TableRow 
                key={idx} 
                className="hover:bg-primary/5 transition-colors border-border/20 group"
              >
                {type === "shipments" ? (
                  <>
                    <TableCell className="text-xs font-black tracking-widest uppercase py-5">{item.tracking_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
                        {item.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-muted-foreground/80 lowercase italic">{item.carrier_name || item.carrier_code}</TableCell>
                    <TableCell className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{item.created_at_human}</TableCell>
                    <TableCell className="text-xs font-bold truncate max-w-[150px]">{item.customer_name || "Guest"}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-xs font-black tracking-widest uppercase py-5">{item.customerId.substring(0, 12)}...</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest ${item.status === 'approved' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' : 'border-amber-500/20 bg-amber-500/5 text-amber-500'}`}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-black tracking-tighter text-right">₹{item.estimatedPrice?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-[10px] font-bold text-muted-foreground">{item.origin.city}</TableCell>
                    <TableCell className="text-[10px] font-bold text-muted-foreground">{item.destination.city}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
