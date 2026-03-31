'use client';

import * as React from 'react';
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
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { 
  IconDots, 
  IconShield, 
  IconUser, 
  IconUsers, 
  IconChevronLeft, 
  IconChevronRight,
  IconSearch,
  IconFilter,
  IconEdit,
  IconTrash,
  IconLock,
  IconArrowsSort
} from '@tabler/icons-react';

interface UserListProps {
  users: any[] | undefined;
  currentUser: any;
  orgMap: Record<string, string>;
}

export function UserList({ users, currentUser, orgMap }: UserListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          User Account
          <IconArrowsSort className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || <IconUser className="size-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight">{user.name || 'Anonymous'}</span>
              <span className="text-xs text-muted-foreground/80 lowercase">{user.email || 'No email'}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Privileges',
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        return (
          <Badge variant="outline" className={`gap-1 capitalize font-semibold ${
            role === 'admin' ? 'border-primary/50 text-primary bg-primary/5 shadow-sm' : 
            role === 'staff' ? 'border-amber-500/50 text-amber-600 bg-amber-500/5' : 
            'border-emerald-500/50 text-emerald-600 bg-emerald-500/5'
          }`}>
            {role === 'admin' && <IconShield className="size-3" />}
            {role}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value === "all" ? true : row.getValue(id) === value;
      },
    },
    {
      accessorKey: 'orgId',
      header: 'Organization',
      cell: ({ row }) => {
        const orgId = row.getValue('orgId') as string;
        const orgName = orgMap[orgId] || orgId || 'Global';
        return <span className="text-sm font-semibold text-muted-foreground">{orgName}</span>;
      },
    },
    {
      accessorKey: '_creationTime',
      header: 'Member Since',
      cell: ({ row }) => {
        const date = row.getValue('_creationTime') as number;
        return <span className="text-xs text-muted-foreground">{format(date, 'MMM dd, yyyy')}</span>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <IconDots className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs italic">User Actions</DropdownMenuLabel>
                <DropdownMenuItem className="gap-2">
                  <IconEdit className="size-4" /> Edit Profile
                </DropdownMenuItem>
                
                {currentUser.role === 'admin' && (
                  <>
                    <DropdownMenuItem className="gap-2">
                      <IconLock className="size-4" /> Access Control
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/5">
                      <IconTrash className="size-4" /> Terminate Account
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });

  if (users === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
        <div className="rounded-md border h-64 animate-pulse bg-muted/20" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card/40 p-1.5 rounded-xl border-dashed border-2">
        <div className="flex flex-1 items-center gap-2 max-w-sm ml-2">
          <IconSearch className="size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="border-none shadow-none focus-visible:ring-0 h-9"
          />
        </div>
        <div className="flex items-center gap-2 mr-2">
          <Select
            value={(table.getColumn("role")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) => table.getColumn("role")?.setFilterValue(value)}
          >
            <SelectTrigger className="h-9 w-[130px] bg-background">
              <IconFilter className="size-3 mr-2" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card/50 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs uppercase tracking-wider font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                  className="hover:bg-muted/20 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                     <div className="p-4 bg-muted/50 rounded-full">
                        <IconUser size={12} className="size-8 text-muted-foreground" />
                     </div>
                     <div className="space-y-1">
                        <p className="text-sm font-semibold tracking-tight">No identities matching your criteria</p>
                        <p className="text-xs text-muted-foreground italic">Try refing your search or role filters.</p>
                     </div>
                     <Button 
                       variant="link" 
                       size="sm" 
                       onClick={() => {
                          table.resetColumnFilters();
                          table.setGlobalFilter("");
                       }}
                       className="text-xs font-bold"
                     >
                       Clear all filters
                     </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getFilteredRowModel().rows.length > 0 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-xs text-muted-foreground font-medium italic">
            Displaying <strong>{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</strong> - <strong>{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}</strong> of <strong>{table.getFilteredRowModel().rows.length}</strong> unique identities
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: table.getPageCount() }, (_, i) => (
                <Button
                  key={i}
                  variant={table.getState().pagination.pageIndex === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => table.setPageIndex(i)}
                  className="h-8 w-8 p-0 text-xs shadow-none border-none font-bold"
                >
                  {i + 1}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

