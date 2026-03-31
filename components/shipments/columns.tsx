"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  Eye, 
  Trash2, 
  RefreshCw,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Info,
  Archive, 
  ArchiveRestore,
  ExternalLink
} from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useOrg } from "@/components/providers/org-provider";
import { RetrackDialog } from "./retrack-dialog";
import { ShipmentQR } from "./shipment-qr";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { CopyButton } from "@/components/copy-button";

const ActionCell = ({ shipment }: { shipment: Doc<"shipments"> }) => {
  const { activeOrgId, sessionId } = useOrg();
  const archive = useMutation(api.shipments.mutations.archiveShipment);
  const unarchive = useMutation(api.shipments.mutations.unarchiveShipment);
  const deleteShipment = useMutation(api.shipments.mutations.deleteShipment);
  const [loading, setLoading] = React.useState(false);
  const [retrackOpen, setRetrackOpen] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);

  const org = useQuery(api.organizations.queries.getOrganization, 
    activeOrgId ? { id: activeOrgId, sessionId } : "skip"
  );

  const handleArchive = async () => {
    setLoading(true);
    try {
      if (!activeOrgId) throw new Error("No active organization");
      await archive({ id: shipment._id as any, orgId: activeOrgId, sessionId });
      toast.success("Manifest archived successfully");
    } catch (error) {
      toast.error("Failed to archive manifest");
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async () => {
    setLoading(true);
    try {
      if (!activeOrgId) throw new Error("No active organization");
      await unarchive({ id: shipment._id as any, orgId: activeOrgId, sessionId });
      toast.success("Manifest restored to active fleet");
    } catch (error) {
      toast.error("Failed to restore manifest");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this tracking record? This cannot be undone.")) return;
    setLoading(true);
    try {
      if (!activeOrgId) throw new Error("No active organization");
      await deleteShipment({ id: shipment._id as any, orgId: activeOrgId, sessionId });
      toast.success("Manifest record purged");
    } catch (error) {
      toast.error("Failed to delete manifest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50 rounded-md" disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin text-primary" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card/80 backdrop-blur-lg border-border/50 shadow-2xl">
        <DropdownMenuLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground flex items-center justify-between">
            Shipment Actions
            {shipment.archived_at && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-500 border-amber-500/20">Archived</Badge>}
        </DropdownMenuLabel>
        
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors">
          <Link href={`/shipments/${shipment._id}`}>
            <Eye className="mr-2 h-4 w-4" /> View Console
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors">
          <a href={`/track?identifier=${shipment.white_label_code || shipment.tracking_number}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Open Public Portal
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem 
            onClick={() => setQrOpen(true)}
            className="cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors font-semibold"
        >
            <QrCode className="mr-2 h-4 w-4" /> View Shipment QR
        </DropdownMenuItem>

        <DropdownMenuItem 
            onClick={() => setRetrackOpen(true)}
            className="cursor-pointer text-primary focus:bg-primary/5 transition-colors font-semibold"
        >
            <RefreshCw className="mr-2 h-4 w-4" /> Update Carrier
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/30" />
        
        {shipment.archived_at ? (
          <DropdownMenuItem onClick={handleUnarchive} className="cursor-pointer text-emerald-500 focus:bg-emerald-500/5 transition-colors font-semibold">
            <ArchiveRestore className="mr-2 h-4 w-4" /> Restore to Active
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleArchive} className="cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors">
            <Archive className="mr-2 h-4 w-4" /> Move to Archive
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-border/30" />
        
        <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-rose-500 focus:bg-rose-500/5 transition-colors font-semibold">
          <Trash2 className="mr-2 h-4 w-4" /> Purge Tracking Data
        </DropdownMenuItem>
      </DropdownMenuContent>

      <RetrackDialog 
        shipment={shipment}
        open={retrackOpen}
        onOpenChange={setRetrackOpen}
      />

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <ShipmentQR 
            trackingNumber={shipment.white_label_code || shipment.tracking_number} 
            publicDomain={org?.publicDomain}
            customerName={shipment.customer_name}
        />
      </Dialog>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<any>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px] border-muted-foreground/30"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px] border-muted-foreground/30"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "tracking_number",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Track ID
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const trackingNumber = row.original.tracking_number;
      
      return (
        <div className="flex flex-col gap-0.5 group/id">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold tracking-tight text-foreground uppercase">
              {trackingNumber}
            </span>
            <CopyButton value={trackingNumber} label="ID" className="opacity-0 group-hover/id:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] text-primary/40 uppercase font-semibold tracking-wider leading-none">
              VIA {row.original.provider}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "white_label_code",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        White Label
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const code = row.original.white_label_code;
      return (
        <div className="flex items-center gap-1.5 group/wl">
          <span className="font-mono text-sm font-semibold tracking-tight text-primary uppercase">
            {code || "—"}
          </span>
          {code && <CopyButton value={code} label="WL Code" className="opacity-0 group-hover/wl:opacity-100 transition-opacity" />}
        </div>
      );
    },
  },
  {
    accessorKey: "carrier_code",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Carrier
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-muted/50 border border-border/20">
            <Package size={14} className="text-muted-foreground" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {(row.original as any).carrier_name || row.getValue("carrier_code")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Status
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusConfig: Record<string, { color: string, icon: any, label?: string }> = {
        pending: { color: "text-slate-500 border-slate-500/20 bg-slate-500/5", icon: Clock, label: 'Pending' },
        info_received: { color: "text-sky-500 border-sky-500/20 bg-sky-500/5", icon: Info, label: 'Info Received' },
        in_transit: { color: "text-blue-500 border-blue-500/20 bg-blue-500/5", icon: Truck, label: 'In Transit' },
        out_for_delivery: { color: "text-orange-500 border-orange-500/20 bg-orange-500/5", icon: Truck, label: 'Out for Delivery' },
        delivered: { color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5", icon: CheckCircle2, label: 'Delivered' },
        failed_attempt: { color: "text-rose-400 border-rose-400/20 bg-rose-400/5", icon: AlertCircle, label: 'Failed Attempt' },
        exception: { color: "text-rose-500 border-rose-500/20 bg-rose-500/5", icon: AlertCircle, label: 'Exception' },
        expired: { color: "text-muted-foreground border-muted/20 bg-muted/5", icon: History, label: 'Expired' },
      };
      
      const config = (statusConfig[status] || { color: "text-muted-foreground/50 border-muted/20", icon: Info }) as { color: string, icon: any, label?: string };
      const Icon = config.icon;

      return (
        <Badge 
          variant="outline" 
          className={`px-2 py-0.5 gap-1.5 rounded-md border shadow-sm transition-all ${config.color}`}
        >
          <Icon size={12} className="shrink-0" />
          <span className="capitalize text-[10px] font-semibold tracking-wide leading-none py-1">
            {config.label || status.replace(/_/g, " ")}
          </span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "customer_name",
    header: "Sender",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 max-w-[150px]">
        <span className="font-semibold text-sm truncate">
          {row.getValue("customer_name") || "Guest Header"}
        </span>
        <div className="flex flex-col gap-0 space-y-0.5">
          <div className="flex items-center justify-between group/mail">
            <span className="text-[10px] text-muted-foreground/70 truncate">
                {row.original.customer_email || "No email"}
            </span>
            {row.original.customer_email && <CopyButton value={row.original.customer_email} label="Email" className="h-4 w-4 opacity-0 group-hover/mail:opacity-100 transition-opacity translate-x-1" />}
          </div>
          {row.original.customer_phone && (
            <div className="flex items-center justify-between group/phone">
                <span className="text-[10px] text-primary/70 font-semibold truncate">
                    {row.original.customer_phone}
                </span>
                <CopyButton value={row.original.customer_phone} label="Phone" className="h-4 w-4 opacity-0 group-hover/phone:opacity-100 transition-opacity translate-x-1" />
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "last_synced_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Last Update
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("last_synced_at") as number;
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <History size={12} className="opacity-50" />
          {formatDistanceToNow(date)} ago
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell shipment={row.original} />,
  },
];

