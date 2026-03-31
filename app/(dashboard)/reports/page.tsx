"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
// Removed useCurrentUser since we need the database user role
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportTable } from "@/components/reports/report-table";
import { 
  FileText, 
  ShieldCheck, 
  Activity, 
  ArrowUpRight 
} from "lucide-react";

export default function ReportsPage() {
  const { activeOrgId, sessionId } = useOrg();
  const currentUser = useQuery(api.users.queries.getCurrentUser, { sessionId });
  const isAuthLoaded = currentUser !== undefined;
  const [reportType, setReportType] = React.useState<"shipments" | "quotes">("shipments");
  const [filters, setFilters] = React.useState<any>({
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    endDate: Date.now(),
  });

  const reportData = useQuery(
    api.reports.queries.getReportData,
    activeOrgId ? { 
      orgId: activeOrgId, 
      sessionId, 
      type: reportType,
      ...filters 
    } : "skip"
  );

  const isLoading = reportData === undefined || !isAuthLoaded;

  if (isAuthLoaded && currentUser && currentUser.role === "customer") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-10 bg-rose-500/5 rounded-3xl border border-rose-500/10">
        <ShieldCheck className="w-16 h-16 text-rose-500 opacity-40 animate-pulse" />
        <h2 className="text-2xl font-black tracking-tighter uppercase text-rose-500">Security Clearance Required</h2>
        <p className="text-muted-foreground text-center max-w-md font-bold text-sm uppercase tracking-tight">
          Your current credentials do not grant access to systemic report intelligence. 
          Please contact an administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 px-6 py-4 lg:p-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-xl shadow-primary/5">
                <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Intelligence Hub</h1>
                    <Badge className="bg-primary text-primary-foreground border-none font-black text-[10px] uppercase px-3 py-1 tracking-widest pointer-events-none">PRO</Badge>
                </div>
                <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1 opacity-70">Strategic operational reporting and data synthesis</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-muted/40 p-2 rounded-2xl border border-border/40 backdrop-blur-xl">
             <div className="flex flex-col px-4 text-right">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Active Intelligence</span>
                <span className="text-sm font-black tabular-nums tracking-tighter">{reportData?.length || 0} Entities</span>
             </div>
             <div className="h-10 w-px bg-border/40" />
             <div className="flex items-center gap-2 px-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live Engine</span>
             </div>
        </div>
      </div>

      {/* Stats Quick Look (Enhanced) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative p-6 bg-card/40 backdrop-blur-2xl border border-border/40 rounded-3xl shadow-2xl group hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/40 transition-all duration-500 overflow-hidden">
            {/* Spotlight Glows */}
            <div className="absolute -right-20 -top-20 size-48 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                        <Activity className="w-4 h-4 text-blue-500" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-500" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Report Density</p>
                <h3 className="text-2xl font-black tracking-tighter mt-1 group-hover:translate-x-1 transition-transform duration-500">{reportType === "shipments" ? "Logistic Manifests" : "Financial Proposals"}</h3>
            </div>
        </div>

        <div className="relative p-6 bg-card/40 backdrop-blur-2xl border border-border/40 rounded-3xl shadow-2xl group hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 hover:border-emerald-500/40 transition-all duration-500 overflow-hidden">
             {/* Spotlight Glows */}
             <div className="absolute -right-20 -top-20 size-48 bg-emerald-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

             <div className="relative z-10">
                 <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 font-black text-[10px] text-emerald-500 group-hover:scale-110 transition-transform duration-500">
                        RT
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Data Latency</p>
                <h3 className="text-2xl font-black tracking-tighter mt-1 group-hover:translate-x-1 transition-transform duration-500">Real-Time Core</h3>
             </div>
        </div>

        <div className="relative p-6 bg-card/40 backdrop-blur-2xl border border-border/40 rounded-3xl shadow-2xl group hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-2 hover:border-amber-500/40 transition-all duration-500 overflow-hidden">
             {/* Spotlight Glows */}
             <div className="absolute -right-20 -top-20 size-48 bg-amber-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

             <div className="relative z-10">
                 <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 font-black text-[10px] text-amber-500 group-hover:scale-110 transition-transform duration-500">
                        SEC
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Access Protocol</p>
                <h3 className="text-2xl font-black tracking-tighter mt-1 group-hover:translate-x-1 transition-transform duration-500">Tier 1 Secured</h3>
             </div>
        </div>
      </div>

      {/* Filters Container */}
      <ReportFilters 
        onFiltersChange={setFilters} 
        reportType={reportType}
        setReportType={setReportType}
      />

      {/* Results Container */}
      <div className="space-y-6">
        <ReportTable 
          data={reportData || []} 
          type={reportType} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}

