"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown, Eye, Archive, Trash2 } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";

export const getColumns = (onViewDetails: (quote: any) => void): ColumnDef<Doc<"quotes">>[] => [
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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <div className="font-medium">{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge 
          variant="outline" 
          className={`uppercase text-[10px] font-bold ${
            status === "approved" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" :
            status === "pending" ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
            status === "reviewing" ? "text-blue-500 border-blue-500/20 bg-blue-500/5" :
            "text-muted-foreground/50 border-muted/20"
          }`}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-semibold text-sm">{row.getValue("customerName")}</span>
        <span className="text-[10px] text-muted-foreground">{(row.original as any).customerEmail}</span>
      </div>
    ),
  },
  {
    id: "originCity",
    header: "Origin",
    accessorFn: (row) => row.origin.city,
    cell: ({ row }) => <div>{row.getValue("originCity")}</div>,
  },
  {
    id: "destinationCity",
    header: "Destination",
    accessorFn: (row) => row.destination.city,
    cell: ({ row }) => <div>{row.getValue("destinationCity")}</div>,
  },
  {
    id: "weight",
    header: "Weight",
    accessorFn: (row) => row.parcelDetails.weightKg,
    cell: ({ row }) => {
      return <div>{row.getValue("weight")} kg</div>;
    },
  },
  {
    accessorKey: "estimatedPrice",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("estimatedPrice") || "0");
      const currency = (row.original as any).orgCurrency || "INR";
      
      if (!price) return <div className="text-muted-foreground italic">Pending</div>;
      
      const formatted = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-LK", {
        style: "currency",
        currency: currency,
        currencyDisplay: "symbol",
      }).format(price);
 
      return <div className="font-bold">{formatted}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const quote = row.original;
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border/50">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(quote);
              }}
              className="cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-muted-foreground">
              <Archive className="mr-2 h-4 w-4" /> Archive Quote
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-red-500 hover:text-red-400 hover:bg-red-500/10">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: "archivedTime",
    header: () => null,
    cell: () => null,
    enableHiding: true,
    filterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      if (filterValue === true) return value !== undefined && value !== null;
      if (filterValue === null) return value === undefined || value === null;
      return true;
    },
  },
];

