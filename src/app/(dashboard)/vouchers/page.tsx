"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { getErrorDetail } from "@/lib/errors";
import { voucherApi } from "@/lib/api/vouchers";
import { toast } from "@/hooks/use-toast";
import type { VoucherCode, CreatedVoucherCode } from "@/types";
import {
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Ticket,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  CopyCheck,
} from "lucide-react";

function formatFenToYuan(fen: number): string {
  return (fen / 100).toFixed(2);
}

function getDefaultStartsAt(): string {
  const now = new Date();
  return now.toISOString().slice(0, 16);
}

function getDefaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 16);
}

export default function VouchersPage() {
  const [generating, setGenerating] = useState(false);
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<CreatedVoucherCode[]>([]);
  const [showCodesDialog, setShowCodesDialog] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<VoucherCode | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);

  // Generate form state
  const [genAmount, setGenAmount] = useState(100);
  const [genCount, setGenCount] = useState(1);
  const [genStartsAt, setGenStartsAt] = useState(getDefaultStartsAt);
  const [genExpiresAt, setGenExpiresAt] = useState(getDefaultExpiresAt);
  const [genRemark, setGenRemark] = useState("");

  const { items: codes, total, page, loading, setPage, refresh } = usePaginatedData<VoucherCode>(
    (params) => voucherApi.getList({ ...params, status: statusFilter }),
    { pageSize: 10, deps: [statusFilter], onError: (e) => console.error("获取兑换码列表失败:", getErrorDetail(e, "未知错误")) },
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const created = await voucherApi.generate({
        amount: genAmount,
        count: genCount,
        starts_at: genStartsAt,
        expires_at: genExpiresAt,
        remark: genRemark || undefined,
      });
      setGeneratedCodes(created);
      setShowGeneratePanel(false);
      setShowCodesDialog(true);
      setGenAmount(100);
      setGenCount(1);
      setGenStartsAt(getDefaultStartsAt());
      setGenExpiresAt(getDefaultExpiresAt());
      setGenRemark("");
      await refresh();
    } catch (error) {
      toast.error("生成失败", getErrorDetail(error, "请重试"));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch { /* ignore */ }
  };

  const handleCopyAll = async () => {
    const allCodes = generatedCodes.map((c) => c.code).join("\n");
    try {
      await navigator.clipboard.writeText(allCodes);
      toast.success("已复制", `${generatedCodes.length} 个兑换码已复制到剪贴板`);
    } catch { /* ignore */ }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await voucherApi.remove(deleteConfirm.id);
      toast.success("已作废", "兑换码已作废");
      setDeleteConfirm(null);
      await refresh();
    } catch (error) {
      toast.error("操作失败", getErrorDetail(error, "请重试"));
    }
  };

  const getStatusText = (code: VoucherCode) => {
    if (code.status === 0) {
      if (new Date(code.expires_at) < new Date()) return "已过期";
      if (new Date(code.starts_at) > new Date()) return "未生效";
      return "有效";
    }
    if (code.status === 1) return "已兑换";
    if (code.status === 2) return "已作废";
    return "未知";
  };

  const getStatusClass = (code: VoucherCode) => {
    const text = getStatusText(code);
    if (text === "有效") return "bg-green-50 text-green-700 border-green-200";
    if (text === "已兑换") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  type FilterOption = { value: number | undefined; label: string };
  const filterOptions: FilterOption[] = [
    { value: undefined, label: "全部" },
    { value: 0, label: "未兑换" },
    { value: 1, label: "已兑换" },
    { value: 2, label: "已作废" },
  ];

  const columns: Column<VoucherCode>[] = [
    {
      key: "code",
      header: "兑换码",
      render: (v) => (
        <code className="inline-flex items-center whitespace-nowrap rounded-lg border border-border bg-secondary px-3 py-1.5 font-mono text-sm">
          {v.code_prefix}****{v.code_suffix}
        </code>
      ),
    },
    {
      key: "amount",
      header: "面额",
      render: (v) => <span className="whitespace-nowrap font-medium">{formatFenToYuan(v.amount)} 元</span>,
    },
    {
      key: "status",
      header: "状态",
      render: (v) => (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusClass(v)}`}>
          {getStatusText(v) === "有效" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {getStatusText(v)}
        </span>
      ),
    },
    {
      key: "starts_at",
      header: "生效时间",
      render: (v) => (
        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          {new Date(v.starts_at).toLocaleString("zh-CN")}
        </div>
      ),
    },
    {
      key: "expires_at",
      header: "过期时间",
      render: (v) => (
        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          {new Date(v.expires_at).toLocaleString("zh-CN")}
        </div>
      ),
    },
    {
      key: "remark",
      header: "备注",
      render: (v) => v.remark || <span className="text-muted-foreground/50">-</span>,
    },
    {
      key: "actions",
      header: "操作",
      render: (v) =>
        v.status === 0 ? (
          <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(v)} className="whitespace-nowrap border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50">
            <Trash2 className="mr-1 h-3 w-3" />
            作废
          </Button>
        ) : (
          <span className="whitespace-nowrap text-sm text-muted-foreground">{getStatusText(v)}</span>
        ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader icon={Ticket} title="兑换码管理" subtitle={`管理用户兑换码 · 共 ${total} 个`} />

      <div className="page-stack">
        <Card className="panel">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value ?? "all"}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-all ${
                      statusFilter === opt.value ? "bg-gray-100 text-gray-950" : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button onClick={() => setShowGeneratePanel(true)} className="self-start sm:self-center">
                <Plus className="mr-2 h-4 w-4" />
                生成兑换码
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="table-shell">
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={codes}
              loading={loading}
              emptyIcon={Ticket}
              emptyTitle="暂无兑换码"
              emptyDescription='点击"生成兑换码"创建新的兑换码'
              rowKey={(item) => item.id}
              page={page}
              pageSize={10}
              total={total}
              onPageChange={setPage}
              showPageInfo
            />
          </div>
        </Card>
      </div>

      {/* 生成兑换码弹窗 */}
      <Dialog open={showGeneratePanel} onOpenChange={setShowGeneratePanel}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              生成兑换码
            </DialogTitle>
            <DialogDescription>设置面额、数量和有效期</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">面额（分）</label>
                <Input type="number" min={1} max={1000000} value={genAmount} onChange={(e) => setGenAmount(parseInt(e.target.value) || 1)} />
                <p className="mt-1 text-xs text-muted-foreground">{formatFenToYuan(genAmount)} 元</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">数量</label>
                <Input type="number" min={1} max={1000} value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">生效时间</label>
                <Input type="datetime-local" value={genStartsAt} onChange={(e) => setGenStartsAt(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">过期时间</label>
                <Input type="datetime-local" value={genExpiresAt} onChange={(e) => setGenExpiresAt(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">备注</label>
              <Input value={genRemark} onChange={(e) => setGenRemark(e.target.value)} placeholder="可选" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneratePanel(false)}>取消</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              确认生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 生成结果弹窗 */}
      <Dialog open={showCodesDialog} onOpenChange={setShowCodesDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>生成成功</DialogTitle>
            <DialogDescription>以下兑换码仅显示一次，请及时复制保存</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-y-auto py-2">
            {generatedCodes.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border bg-secondary/50 px-3 py-2">
                <code className="font-mono text-sm">{c.code}</code>
                <button onClick={() => handleCopy(c.code)} className="rounded p-1 hover:bg-secondary">
                  {copiedCode === c.code ? <CopyCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyAll}>
              <Copy className="mr-2 h-4 w-4" />
              全部复制
            </Button>
            <Button onClick={() => setShowCodesDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="确认作废"
        description={`确认作废此兑换码吗？此操作不可撤销。`}
        variant="destructive"
        confirmLabel="作废"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
