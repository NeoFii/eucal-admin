"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Eye, Search, Users } from "lucide-react";
import type { Column } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { userManagementApi } from "@/lib/api/user-management";
import { getErrorDetail } from "@/lib/errors";
import { formatShanghaiDateTime } from "@/lib/time";
import type { UserListItem } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "1", label: "正常" },
  { value: "0", label: "已禁用" },
] as const;

const STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  0: { label: "已禁用", className: "border-red-200 bg-red-50 text-red-700" },
  1: { label: "正常", className: "border-green-200 bg-green-50 text-green-700" },
};

function formatYuan(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const {
    items: users,
    total,
    page,
    loading,
    setPage,
  } = usePaginatedData<UserListItem>(
    (params) =>
      userManagementApi.getList({
        ...params,
        search: appliedSearch || undefined,
        status: statusFilter !== "" ? Number(statusFilter) : undefined,
      }),
    {
      pageSize: 10,
      deps: [appliedSearch, statusFilter],
      onError: (error) => toast.error("加载用户列表失败", getErrorDetail(error, "请稍后重试")),
    },
  );

  const handleSearch = useCallback(() => {
    setAppliedSearch(search.trim());
    setPage(1);
  }, [search, setPage]);

  const columns = useMemo<Column<UserListItem>[]>(
    () => [
      {
        key: "uid",
        header: "UID",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center font-mono text-sm text-muted-foreground",
        render: (u) => u.uid,
      },
      {
        key: "email",
        header: "邮箱",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center font-medium text-foreground",
        render: (u) => u.email,
      },
      {
        key: "status",
        header: "状态",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center",
        render: (u) => {
          const cfg = STATUS_CONFIG[u.status] ?? STATUS_CONFIG[0];
          return (
            <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${cfg.className}`}>
              {cfg.label}
            </span>
          );
        },
      },
      {
        key: "balance",
        header: "余额",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-foreground",
        render: (u) => formatYuan(u.balance),
      },
      {
        key: "last_login_at",
        header: "最近登录",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-muted-foreground",
        render: (u) => (u.last_login_at ? formatShanghaiDateTime(u.last_login_at) : "从未登录"),
      },
      {
        key: "created_at",
        header: "注册时间",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-muted-foreground",
        render: (u) => formatShanghaiDateTime(u.created_at),
      },
      {
        key: "actions",
        header: "操作",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center",
        render: (u) => (
          <Button variant="outline" size="sm" onClick={() => router.push(`/users/${u.uid}`)}>
            <Eye className="mr-1 h-3.5 w-3.5" />
            查看
          </Button>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="page-stack">
      <PageHeader icon={Users} title="用户管理" subtitle={`共 ${total} 个用户`} />

      <Card className="panel">
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="搜索 UID 或邮箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-xs"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="mr-1 h-3.5 w-3.5" />
              搜索
            </Button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-gray-950/10"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="table-shell">
        <div className="overflow-hidden">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            loadingText="正在加载用户列表..."
            emptyIcon={Users}
            emptyTitle="暂无用户"
            emptyDescription="当前没有匹配的用户记录。"
            rowKey={(u) => u.uid}
            page={page}
            pageSize={10}
            total={total}
            onPageChange={setPage}
            showPageInfo
          />
        </div>
      </Card>
    </div>
  );
}
