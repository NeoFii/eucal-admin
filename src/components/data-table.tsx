"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Pagination } from "@/components/pagination";

export interface Column<T> {
  key: string;
  header: string;
  headerClassName?: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  loadingText?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (item: T) => string | number;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  showPageInfo?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  loadingText,
  emptyIcon,
  emptyTitle = "暂无数据",
  emptyDescription = "当前没有可显示的记录。",
  rowKey,
  page,
  pageSize,
  total,
  onPageChange,
  showPageInfo,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingSpinner text={loadingText} />;
  }

  if (data.length === 0 && emptyIcon) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {emptyTitle}
      </div>
    );
  }

  return (
    <>
      <table className="w-full">
        <thead className="table-head border-b border-border">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.headerClassName ?? "px-6 py-4 text-left text-sm font-semibold"}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item) => (
            <tr key={rowKey(item)} className="table-row">
              {columns.map((col) => (
                <td key={col.key} className={col.className ?? "px-6 py-4"}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {page != null && pageSize != null && total != null && onPageChange ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          showPageInfo={showPageInfo}
        />
      ) : null}
    </>
  );
}
