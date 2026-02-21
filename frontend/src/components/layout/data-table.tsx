"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
}

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onSort?: (column: string, direction: SortDirection) => void;
  onRowClick?: (row: T) => void;
  emptyState?: {
    icon?: React.ElementType;
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  className?: string;
  mobileCardRender?: (row: T) => React.ReactNode;
}

function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  pageSize = 10,
  currentPage = 1,
  totalItems,
  onPageChange,
  onSort,
  onRowClick,
  emptyState,
  className,
  mobileCardRender,
}: DataTableProps<T>) {
  const [sortState, setSortState] = React.useState<SortState>({
    column: null,
    direction: null,
  });

  const effectiveTotalItems = totalItems ?? data.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotalItems / pageSize));

  // Client-side sorting when no onSort callback (server-side)
  const sortedData = React.useMemo(() => {
    if (onSort || !sortState.column || !sortState.direction) return data;

    const col = columns.find((c) => c.id === sortState.column);
    if (!col) return data;

    const sorted = [...data].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      if (typeof col.accessor === "function") {
        aVal = col.accessor(a);
        bVal = col.accessor(b);
      } else {
        aVal = a[col.accessor];
        bVal = b[col.accessor];
      }

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // String comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortState.direction === "asc"
          ? aVal.localeCompare(bVal, "pt-BR")
          : bVal.localeCompare(aVal, "pt-BR");
      }

      // Number comparison
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortState.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [data, sortState, columns, onSort]);

  // Client-side pagination when no onPageChange callback
  const displayData = React.useMemo(() => {
    if (onPageChange) return sortedData; // Server-side pagination
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, onPageChange]);

  const handleSort = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId);
    if (!col?.sortable) return;

    let newDirection: SortDirection;
    if (sortState.column !== columnId) {
      newDirection = "asc";
    } else if (sortState.direction === "asc") {
      newDirection = "desc";
    } else {
      newDirection = null;
    }

    setSortState({
      column: newDirection ? columnId : null,
      direction: newDirection,
    });

    onSort?.(columnId, newDirection);
  };

  const getCellValue = (row: T, col: ColumnDef<T>): React.ReactNode => {
    let rawValue: unknown;
    if (typeof col.accessor === "function") {
      rawValue = col.accessor(row);
    } else {
      rawValue = row[col.accessor];
    }
    if (col.render) {
      return col.render(rawValue, row);
    }
    if (rawValue === null || rawValue === undefined) return "—";
    if (React.isValidElement(rawValue)) return rawValue;
    return String(rawValue);
  };

  const getSortIcon = (columnId: string) => {
    if (sortState.column !== columnId) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    if (sortState.direction === "asc") {
      return <ArrowUp className="h-3.5 w-3.5 text-foreground" />;
    }
    return <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Header skeleton */}
            <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
              {columns.map((col) => (
                <Skeleton
                  key={col.id}
                  shape="line"
                  className={cn("h-4", col.className || "flex-1")}
                />
              ))}
            </div>
            {/* Row skeletons */}
            {Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b last:border-0 px-4 py-4"
              >
                {columns.map((col) => (
                  <Skeleton
                    key={col.id}
                    shape="line"
                    className={cn("h-4", col.className || "flex-1")}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Mobile skeleton */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <Skeleton shape="line" className="h-4 w-3/4" />
              <Skeleton shape="line" className="h-3 w-1/2" />
              <Skeleton shape="line" className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0 && emptyState) {
    return (
      <div className={cn("w-full", className)}>
        <EmptyState
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
          className="rounded-xl border border-border"
        />
      </div>
    );
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, effectiveTotalItems);

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-muted/50 [&_tr]:border-b">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      "h-11 px-4 text-left align-middle font-medium text-muted-foreground",
                      col.sortable && "cursor-pointer select-none hover:text-foreground",
                      col.headerClassName
                    )}
                    onClick={() => col.sortable && handleSort(col.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && getSortIcon(col.id)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {displayData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        "px-4 py-3 align-middle",
                        col.className
                      )}
                    >
                      {getCellValue(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {displayData.map((row) => {
          if (mobileCardRender) {
            return (
              <div
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {mobileCardRender(row)}
              </div>
            );
          }

          // Default mobile card
          const visibleColumns = columns.filter((c) => !c.hideOnMobile);
          return (
            <div
              key={keyExtractor(row)}
              className={cn(
                "rounded-xl border border-border bg-card p-4 space-y-2 transition-colors hover:bg-muted/50",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {visibleColumns.map((col, index) => (
                <div
                  key={col.id}
                  className={cn(
                    "flex items-center justify-between gap-2",
                    index === 0 && "pb-1"
                  )}
                >
                  {index === 0 ? (
                    <span className="font-semibold text-foreground">
                      {getCellValue(row, col)}
                    </span>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {col.header}
                      </span>
                      <span className="text-sm text-right truncate">
                        {getCellValue(row, col)}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Mostrando {startItem}-{endItem} de {effectiveTotalItems}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="hidden items-center gap-1 sm:flex">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first, last, current, and neighbors
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | "ellipsis")[]>((acc, page, i, arr) => {
                  if (i > 0) {
                    const prev = arr[i - 1];
                    if (page - prev > 1) {
                      acc.push("ellipsis");
                    }
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, i) => {
                  if (item === "ellipsis") {
                    return (
                      <span
                        key={`ellipsis-${i}`}
                        className="px-1 text-muted-foreground"
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <Button
                      key={item}
                      variant={item === currentPage ? "default" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onPageChange?.(item)}
                    >
                      {item}
                    </Button>
                  );
                })}
            </div>
            <span className="text-sm text-muted-foreground sm:hidden">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Proximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
DataTable.displayName = "DataTable";

export { DataTable };
