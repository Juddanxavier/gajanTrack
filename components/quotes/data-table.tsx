"use client";

import * as React from "react";
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
  TableRow,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
  Search,
  Package,
  Clock,
  CheckCircle2,
  Banknote,
  Trash2,
  Archive,
  MapPin,
  Scale,
  FileText,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  CheckSquare,
  ChevronDown,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "convex/react";
import { useCurrentUser } from "@/lib/auth/client";
import { useOrg } from "@/components/providers/org-provider";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DataTableProps<TData> {
  data: TData[];
}

export function DataTable<TData>({
  data,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [
      { id: "archivedTime", value: null } // Default to showing only non-archived quotes
    ]
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      archivedTime: false,
    });
  const { activeOrgId, sessionId } = useOrg();
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedQuote, setSelectedQuote] = React.useState<any>(null);
  
  // Local state for the update form inside the sheet
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [updateStatus, setUpdateStatus] = React.useState<string>("");
  const [updatePrice, setUpdatePrice] = React.useState<string>("");
  const [updateNotes, setUpdateNotes] = React.useState<string>("");

  const updateQuoteStatusMutation = useMutation(api.quotes.updateQuoteStatus);
  const softDelete = useMutation(api.quotes.softDeleteQuote);
  const archiveQuoteMutation = useMutation(api.quotes.archiveQuote);

  const handleOpenDetails = (quote: any) => {
    setSelectedQuote(quote);
    setUpdateStatus(quote.status);
    setUpdatePrice(quote.estimatedPrice?.toString() || "");
    setUpdateNotes(quote.staffNotes || "");
  };

  const onUpdateStatus = async () => {
    if (!selectedQuote) return;
    setIsUpdating(true);
    try {
      await updateQuoteStatusMutation({
        id: selectedQuote._id,
        orgId: activeOrgId!,
        status: updateStatus as any,
        estimatedPrice: updatePrice ? parseFloat(updatePrice) : undefined,
        staffNotes: updateNotes,
        sessionId,
      });
      toast.success("Quote status updated successfully.");
      setSelectedQuote(null);
    } catch (error) {
      toast.error("Failed to update status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const onDeleteQuote = async (quoteId?: any) => {
    const id = quoteId || selectedQuote?._id;
    if (!id || !confirm("Are you sure you want to delete this quote?")) return;
    setIsUpdating(true);
    try {
      await softDelete({ id, orgId: activeOrgId!, sessionId });
      toast.success("Quote marked for deletion.");
      setSelectedQuote(null);
    } catch (error) {
      toast.error("Failed to delete quote.");
    } finally {
      setIsUpdating(false);
    }
  };

  const onArchiveQuote = async (quoteId?: any) => {
    const id = quoteId || selectedQuote?._id;
    if (!id) return;
    setIsUpdating(true);
    try {
      await archiveQuoteMutation({ id, orgId: activeOrgId!, sessionId });
      toast.success("Quote moved to archive.");
      setSelectedQuote(null);
    } catch (error) {
      toast.error("Failed to archive quote.");
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 hover:bg-transparent"
        >
          Date <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-semibold text-[11px] text-muted-foreground">{new Date(row.getValue("createdAt")).toLocaleDateString()}</div>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 hover:bg-transparent"
        >
          Status <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const colors: Record<string, string> = {
          approved: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
          pending: "text-amber-500 border-amber-500/20 bg-amber-500/5",
          reviewing: "text-blue-500 border-blue-500/20 bg-blue-500/5",
          rejected: "text-rose-500 border-rose-500/20 bg-rose-500/5",
        };
        const color = colors[status] || "text-muted-foreground/50 border-muted/20";
        return (
          <Badge 
            variant="outline" 
            className={`px-2 py-0.5 rounded-md uppercase text-[10px] font-semibold tracking-wider ${color}`}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 hover:bg-transparent"
        >
          Customer <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight">{row.getValue("customerName")}</span>
          <span className="text-[10px] text-muted-foreground/70 font-medium">{(row.original as any).customerEmail}</span>
        </div>
      ),
    },
    {
      id: "originCity",
      header: "Origin",
      accessorFn: (row) => row.origin.city,
      cell: ({ row }) => <div className="text-xs font-semibold uppercase tracking-wide">{row.getValue("originCity")}</div>,
    },
    {
      id: "destinationCity",
      header: "Destination",
      accessorFn: (row) => row.destination.city,
      cell: ({ row }) => <div className="text-xs font-semibold uppercase tracking-wider">{row.getValue("destinationCity")}</div>,
    },
    {
      id: "weight",
      header: "Weight",
      accessorFn: (row) => row.parcelDetails.weightKg,
      cell: ({ row }) => <div className="text-sm font-semibold tracking-tighter text-muted-foreground/80">{row.getValue("weight")} KG</div>,
    },
    {
      accessorKey: "estimatedPrice",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 hover:bg-transparent"
        >
          Price <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("estimatedPrice") || "0");
        const currency = (row.original as any).orgCurrency || "INR";
        if (!price) return <div className="text-[10px] uppercase font-semibold text-muted-foreground/40 italic tracking-wider">Pending</div>;
        return (
          <div className="font-semibold text-sm tracking-tighter text-primary">
            {new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-LK", {
              style: "currency",
              currency: currency,
              currencyDisplay: "symbol",
            }).format(price)}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const quote = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border/50">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider opacity-50">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDetails(quote); }} className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchiveQuote(quote._id); }} className="cursor-pointer">
                <Archive className="mr-2 h-4 w-4" /> Archive Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteQuote(quote._id); }} className="cursor-pointer text-red-500 focus:text-red-400">
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
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleBulkArchive = async () => {
    const promise = Promise.all(
        selectedRows.map((row: any) => 
            archiveQuoteMutation({ id: row.original._id, orgId: activeOrgId!, sessionId })
        )
    );

    toast.promise(promise, {
      loading: `Archiving ${selectedRows.length} quotes...`,
      success: `Successfully archived ${selectedRows.length} quotes.`,
      error: 'Failed to archive some quotes.',
    });

    table.resetRowSelection();
  };

  const handleBulkApprove = async () => {
    const promise = Promise.all(
        selectedRows.map((row: any) => 
            updateQuoteStatusMutation({ id: row.original._id, orgId: activeOrgId!, status: "approved", sessionId })
        )
    );

    toast.promise(promise, {
      loading: `Approving ${selectedRows.length} quotes...`,
      success: `Successfully approved ${selectedRows.length} quotes.`,
      error: 'Failed to approve some quotes.',
    });

    table.resetRowSelection();
  };

  const handleTabChange = (value: string) => {
    table.getColumn("status")?.setFilterValue(undefined);
    table.getColumn("archivedTime")?.setFilterValue(undefined);
    if (value === "archive") {
      table.getColumn("archivedTime")?.setFilterValue(true);
    } else {
      table.getColumn("archivedTime")?.setFilterValue(null);
      if (value !== "all") table.getColumn("status")?.setFilterValue(value);
    }
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
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5 bg-muted/20 p-1 rounded-lg border border-border/40">
            <TabsTrigger value="all" className="text-[10px] font-semibold uppercase tracking-wider py-2 rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-[10px] font-semibold uppercase tracking-wider py-2 rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-[10px] font-semibold uppercase tracking-wider py-2 rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="text-[10px] font-semibold uppercase tracking-wider py-2 rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Rejected</TabsTrigger>
            <TabsTrigger value="archive" className="text-[10px] font-semibold uppercase tracking-wider py-2 rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Archive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col shadow-xl">
        {/* Dedicated Toolbar */}
        <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search by origin city..."
                value={(table.getColumn("originCity")?.getFilterValue() as string) ?? ""}
                onChange={(e) => table.getColumn("originCity")?.setFilterValue(e.target.value)}
                className="pl-11 bg-background/50 border-border/50 h-12 text-sm font-medium focus-visible:ring-primary/20"
              />
            </div>

            {hasSelection && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="h-8 w-px bg-border/40 mx-2" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="default" className="h-10 bg-primary shadow-lg shadow-primary/20 gap-2 px-4 rounded-md font-semibold uppercase tracking-wider text-[10px]">
                                <CheckSquare className="w-3.5 h-3.5" />
                                Bulk Actions ({selectedRows.length})
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 bg-card border-border/50 shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Modify Selected</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleBulkApprove} className="gap-2 cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Requests
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleBulkArchive} className="gap-2 cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors">
                                <Archive className="w-3.5 h-3.5" /> Move to Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDeleteQuote()} className="gap-2 cursor-pointer text-rose-500 font-semibold focus:bg-rose-500/5 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
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
            <TableHeader className="bg-muted/50 border-b border-border/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-border/40">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-12 text-[10px] uppercase font-semibold tracking-wider px-4">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group cursor-pointer hover:bg-muted/30 transition-colors border-border/40"
                    onClick={() => handleOpenDetails(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3 align-middle text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground italic">
                    No quote requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 order-2 sm:order-1">
            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} record(s) active
          </div>
          
          <div className="order-1 sm:order-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={(e) => { e.stopPropagation(); table.previousPage(); }}
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
                        onClick={(e) => { e.stopPropagation(); table.setPageIndex((page as number) - 1); }}
                        isActive={currentPage === page}
                        className="cursor-pointer hover:bg-muted border-border/50 text-xs font-bold"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext 
                    onClick={(e) => { e.stopPropagation(); table.nextPage(); }}
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

      <Sheet open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] bg-card border-l border-border/50 flex flex-col p-0">
          {selectedQuote && (
            <>
              <SheetHeader className="p-6 bg-muted/20 border-b border-border/50 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={`uppercase text-[10px] font-bold ${
                        selectedQuote.status === "approved" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" :
                        selectedQuote.status === "pending" ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                        selectedQuote.status === "reviewing" ? "text-blue-500 border-blue-500/20 bg-blue-500/5" :
                        "text-muted-foreground/50 border-muted/20"
                      }`}
                    >
                      {selectedQuote.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">#{selectedQuote._id.slice(-6)}</span>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border/50">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50">Advanced Actions</DropdownMenuLabel>
                      <DropdownMenuItem 
                        onClick={() => onArchiveQuote()} 
                        disabled={isUpdating || !!selectedQuote.archivedTime}
                        className="cursor-pointer"
                      >
                        <Archive className="mr-2 h-4 w-4" /> Archive Quote
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDeleteQuote()} 
                        disabled={isUpdating}
                        className="cursor-pointer text-red-500 focus:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Quote
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <SheetTitle className="text-2xl font-bold">Quote Details</SheetTitle>
                <SheetDescription>Review the quote and update its status or estimated price.</SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Route Information
                  </h3>
                  <div className="grid gap-4 pl-6 relative">
                    <div className="absolute left-1 top-2 bottom-2 w-[2px] bg-border/50" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Origin</p>
                      <p className="text-sm font-medium">{selectedQuote.origin.address}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Destination</p>
                      <p className="text-sm font-medium">{selectedQuote.destination.address}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" /> Parcel Details
                  </h3>
                  <div className="grid grid-cols-2 gap-6 pl-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">Weight</p>
                      <p className="text-sm font-bold">{selectedQuote.parcelDetails.weightKg} kg</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">Description</p>
                      <p className="text-sm border border-border/30 bg-muted/20 p-3 rounded-lg">{selectedQuote.parcelDetails.description}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-2 border-t border-border/30">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Management Actions
                  </h3>
                  <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase">Update Status</Label>
                      <Select value={updateStatus} onValueChange={setUpdateStatus}>
                        <SelectTrigger className="bg-background border-border/50">
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending Review</SelectItem>
                          <SelectItem value="reviewing">In Progress</SelectItem>
                          <SelectItem value="approved">Approve & Price</SelectItem>
                          <SelectItem value="rejected">Reject Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase">Estimated Price ({selectedQuote.orgCurrency})</Label>
                      <div className="relative">
                        <Banknote className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="number" value={updatePrice} onChange={(e) => setUpdatePrice(e.target.value)} className="pl-9 bg-background border-border/50" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase">Staff Notes</Label>
                      <Textarea value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} className="min-h-[100px] bg-background border-border/50" />
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="p-6 bg-muted/20 border-t border-border/50 flex flex-row items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setSelectedQuote(null)}>Cancel</Button>
                <Button onClick={onUpdateStatus} disabled={isUpdating} className="min-w-[140px]">
                  {isUpdating ? "Saving..." : "Update Quote"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
