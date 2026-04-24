import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  showPageInfo?: boolean;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  showPageInfo = false,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="whitespace-nowrap text-sm text-muted-foreground">
        显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          上一页
        </Button>
        {showPageInfo ? (
          <span className="px-2 text-sm text-muted-foreground">
            第 {page} 页，共 {totalPages} 页
          </span>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

