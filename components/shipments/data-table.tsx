"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Settings2, Search, Trash2, Archive, RefreshCw, ChevronDown, CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/client";
import { useOrg } from "@/components/providers/org-provider";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
}

export function ShipmentsDataTable<TData, TValue>({
  columns,
  data,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const { user } = useCurrentUser();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const archiveShipment = useMutation(api.shipments.mutations.archiveShipment);
  const refreshShipment = useAction(api.shipments.actions.refreshShipment);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const { activeOrgId, sessionId } = useOrg();

  const handleBulkArchive = async () => {
    if (!activeOrgId) return;
    const promise = Promise.all(
        selectedRows.map((row: any) => 
            archiveShipment({ id: row.original._id, orgId: activeOrgId, sessionId })
        )
    );

    toast.promise(promise, {
      loading: `Archiving ${selectedRows.length} shipments...`,
      success: `Successfully archived ${selectedRows.length} shipments.`,
      error: 'Failed to archive some shipments.',
    });

    table.resetRowSelection();
  };

  const deleteShipment = useMutation(api.shipments.mutations.deleteShipment);

  const handleBulkDelete = async () => {
    if (!activeOrgId) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedRows.length} tracking records? This cannot be undone.`)) return;

    const promise = Promise.all(
        selectedRows.map((row: any) => 
            deleteShipment({ id: row.original._id, orgId: activeOrgId, sessionId })
        )
    );

    toast.promise(promise, {
      loading: `Deleting ${selectedRows.length} shipments...`,
      success: `Successfully purged ${selectedRows.length} records.`,
      error: 'Failed to delete some records.',
    });

    table.resetRowSelection();
  };

  const handleBulkRefresh = async () => {
    if (!activeOrgId) return;
    const promise = Promise.all(
        selectedRows.map((row: any) => 
            refreshShipment({ shipment_id: row.original._id, orgId: activeOrgId, sessionId })
        )
    );

    toast.promise(promise, {
      loading: `Refreshing status for ${selectedRows.length} shipments...`,
      success: `Successfully refreshed ${selectedRows.length} shipments.`,
      error: 'Failed to refresh some statuses.',
    });

    table.resetRowSelection();
  };

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="w-full">
      <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col shadow-xl">
        {/* Dedicated Toolbar */}
        <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search tracking numbers..."
                value={(table.getColumn("tracking_number")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("tracking_number")?.setFilterValue(event.target.value)
                }
                className="pl-11 bg-background/50 border-border/50 h-10 w-full sm:w-[250px] text-sm font-medium focus-visible:ring-primary/20"
              />
            </div>
            
            {/* Carrier Filter */}
            {table.getColumn("carrier_code") && (
              <Select
                value={(table.getColumn("carrier_code")?.getFilterValue() as string) ?? "all"}
                onValueChange={(val) => {
                  table.getColumn("carrier_code")?.setFilterValue(val === "all" ? undefined : val);
                }}
              >
                <SelectTrigger className="h-10 w-[140px] bg-background/50 border-border/50 text-sm font-medium">
                  <SelectValue placeholder="All Carriers" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="all">All Carriers</SelectItem>
                  {(() => {
                    const carriersMap = new Map<string, string>();
                    data.forEach((d: any) => {
                      if (d.carrier_code && !carriersMap.has(d.carrier_code)) {
                        carriersMap.set(d.carrier_code, d.carrier_name || d.carrier_code);
                      }
                    });
                    return Array.from(carriersMap.entries()).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        <span className="uppercase">{name}</span>
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            )}

            {hasSelection && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="h-8 w-px bg-border/40 mx-2" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="default" className="h-10 bg-primary shadow-lg shadow-primary/20 gap-2 px-4 rounded-md font-semibold uppercase tracking-wider text-[10px]">
                                <CheckSquare size={14} />
                                Bulk Actions ({selectedRows.length})
                                <ChevronDown size={14} className="opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 bg-card border-border/50 shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Modify Selected</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleBulkRefresh} className="gap-2 cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors">
                                <RefreshCw size={14} /> Sync Telemetry
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleBulkArchive} className="gap-2 cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors">
                                <Archive size={14} /> Move to Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleBulkDelete} className="gap-2 cursor-pointer text-rose-500 font-bold focus:bg-rose-500/5 transition-colors">
                                <Trash2 size={14} /> Delete Tracking
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-12 px-6 border-border/50 bg-background/50 gap-2 font-semibold uppercase tracking-wider text-[10px]">
                  <Settings2 className="h-4 w-4" />
                  Table View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border/50">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id.replace(/_/g, " ")}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-border/40">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-10 text-xs font-semibold uppercase text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="h-16">
                      <Skeleton className="h-4 w-full opacity-50" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/30 border-border/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground italic">
                  No shipments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 order-2 sm:order-1">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} record(s) active
        </div>
        
        <div className="order-1 sm:order-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => table.previousPage()}
                  className={cn(
                    "cursor-pointer hover:bg-muted border-border/50",
                    !table.getCanPreviousPage() && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              
              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => table.setPageIndex((page as number) - 1)}
                      isActive={currentPage === page}
                      className="cursor-pointer hover:bg-muted border-border/50 text-xs font-semibold"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext 
                  onClick={() => table.nextPage()}
                  className={cn(
                    "cursor-pointer hover:bg-muted border-border/50",
                    !table.getCanNextPage() && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
      </div>
    </div>
  );
}

