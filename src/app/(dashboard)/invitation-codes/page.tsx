"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
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
import {
  invitationCodeApi,
  type InvitationCode,
  type GenerateInvitationCodeRequest,
  type UpdateInvitationCodeRequest,
} from "@/lib/api/invitation";
import {
  Plus,
  RefreshCw,
  Power,
  PowerOff,
  Copy,
  Ticket,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  CopyCheck,
  Edit3,
} from "lucide-react";

// 过期天数选项（保留用于快捷选择）
const EXPIRY_OPTIONS = [
  { value: 7, label: "7 天后" },
  { value: 30, label: "30 天后" },
  { value: 90, label: "90 天后" },
  { value: 180, label: "180 天后" },
  { value: 365, label: "365 天后" },
];

export default function InvitationCodesPage() {
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);
  // 过期时间：使用具体日期时间，默认为空（表示使用默认7天）
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);

  // 状态筛选：null=全部, valid=有效, invalid=无效
  const [statusFilter, setStatusFilter] = useState<"valid" | "invalid" | null>(null);

  // 编辑弹窗
  const [editingCode, setEditingCode] = useState<InvitationCode | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState<string>("");
  const [editRemark, setEditRemark] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  // 获取邀请码列表
  const { items: codes, total, page, loading, setPage, refresh } = usePaginatedData<InvitationCode>(
    (params) => invitationCodeApi.getList(params),
    {
      pageSize: 10,
      deps: [statusFilter],
      onError: (e) => console.error("获取邀请码列表失败:", getErrorDetail(e, "未知错误")),
    },
  );

  // 检查邀请码是否有效
  const isCodeValid = (code: InvitationCode): boolean => {
    if (code.status !== 0) return false; // 未使用
    if (code.expires_at && new Date(code.expires_at) < new Date()) return false; // 已过期
    return true;
  };

  // 过滤邀请码
  const filteredCodes = codes.filter((code) => {
    if (statusFilter === "valid") return isCodeValid(code);
    if (statusFilter === "invalid") return !isCodeValid(code);
    return true;
  });

  // 生成邀请码
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const params: GenerateInvitationCodeRequest = {
        quantity: generateCount,
      };

      // 如果选择了具体过期时间，则直接发送日期字符串（格式: "2026-03-04T14:00"）
      // 不使用 toISOString()，避免时区转换问题
      if (expiresAt) {
        params.expires_at = expiresAt;
      }

      await invitationCodeApi.generate(params);
      await refresh();
      setShowGeneratePanel(false);
      setExpiresAt(""); // 重置
    } catch (error) {
      console.error("生成邀请码失败:", error);
    } finally {
      setGenerating(false);
    }
  };

  // 复制邀请码
  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  // 启用/弃用邀请码
  const handleToggleStatus = async (code: InvitationCode) => {
    try {
      if (code.status === 0) {
        await invitationCodeApi.disable(code.id);
      } else if (code.status === 2) {
        await invitationCodeApi.enable(code.id);
      }
      await refresh();
    } catch (error) {
      console.error("操作邀请码失败:", error);
    }
  };

  // 打开编辑弹窗
  const handleEdit = (code: InvitationCode) => {
    setEditingCode(code);
    setEditExpiresAt(code.expires_at ? code.expires_at.slice(0, 16) : "");
    setEditRemark(code.remark || "");
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingCode) return;
    setSavingEdit(true);
    try {
      const data: UpdateInvitationCodeRequest = {};
      if (editExpiresAt) {
        // 直接发送日期字符串，避免时区转换问题
        data.expires_at = editExpiresAt;
      }
      if (editRemark !== editingCode.remark) {
        data.remark = editRemark || undefined;
      }
      await invitationCodeApi.update(editingCode.id, data);
      await refresh();
      setEditingCode(null);
    } catch (error) {
      console.error("更新邀请码失败:", error);
    } finally {
      setSavingEdit(false);
    }
  };

  // 状态配置
  type FilterValue = "valid" | "invalid" | null;
  const statusConfig: { value: FilterValue; label: string; icon: typeof Filter; color: string }[] = [
    { value: null, label: "全部", icon: Filter, color: "text-muted-foreground" },
    { value: "valid", label: "有效", icon: CheckCircle2, color: "text-green-600" },
    { value: "invalid", label: "无效", icon: XCircle, color: "text-red-600" },
  ];

  const getStatusIcon = (code: InvitationCode) => {
    const isValid = isCodeValid(code);
    if (isValid) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = (code: InvitationCode) => {
    const isValid = isCodeValid(code);
    if (isValid) return "有效";
    if (code.status === 1) return "已使用";
    if (code.status === 2) return "已弃用";
    if (code.expires_at && new Date(code.expires_at) < new Date()) return "已过期";
    return "无效";
  };

  const getStatusClass = (code: InvitationCode) => {
    const isValid = isCodeValid(code);
    if (isValid) return "bg-green-50 text-green-700 border-green-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  // 列定义
  const columns: Column<InvitationCode>[] = [
    {
      key: "code",
      header: "邀请码",
      render: (code) => (
        <div className="flex items-center gap-3">
          <code className="inline-flex items-center rounded-lg border border-border bg-secondary px-3 py-1.5 font-mono text-sm text-foreground">
            {code.code}
          </code>
          <button
            onClick={() => handleCopy(code.code)}
            className="inline-flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-secondary"
            title="复制"
          >
            {copiedCode === code.code ? (
              <CopyCheck className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: "status",
      header: "状态",
      render: (code) => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium leading-none border ${getStatusClass(code)}`}
        >
          {getStatusIcon(code)}
          {getStatusText(code)}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "创建时间",
      render: (code) => (
        <div className="flex items-center gap-2 text-sm leading-none text-muted-foreground">
          <Clock className="w-4 h-4" />
          {new Date(code.created_at).toLocaleString("zh-CN")}
        </div>
      ),
    },
    {
      key: "expires_at",
      header: "过期时间",
      className: "py-4 px-6 text-sm text-muted-foreground",
      render: (code) =>
        code.expires_at ? (
          <div className="flex items-center gap-2 leading-none">
            <Clock className="w-4 h-4" />
            {new Date(code.expires_at).toLocaleString("zh-CN")}
          </div>
        ) : (
          <span className="text-green-600 font-medium">永不过期</span>
        ),
    },
    {
      key: "remark",
      header: "备注",
      className: "max-w-[200px] truncate px-6 py-4 text-sm text-muted-foreground",
      render: (code) =>
        code.remark || <span className="text-muted-foreground/50">-</span>,
    },
    {
      key: "actions",
      header: "操作",
      render: (code) => (
        <div className="flex items-center gap-2">
          {code.status === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(code)}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              编辑
            </Button>
          )}
          {code.status === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleStatus(code)}
              className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              <PowerOff className="w-3 h-3 mr-1" />
              弃用
            </Button>
          )}
          {code.status === 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleStatus(code)}
              className="border-green-200 text-green-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
            >
              <Power className="w-3 h-3 mr-1" />
              启用
            </Button>
          )}
          {code.status === 1 && (
            <span className="px-3 text-sm text-muted-foreground">已使用</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      {/* 顶部装饰 */}
      <PageHeader
        icon={Ticket}
        title="邀请码管理"
        subtitle={`管理用户注册邀请码 · 共 ${total} 个邀请码`}
      />

      <div className="page-stack">
        {/* 操作栏 */}
        <Card className="panel">
          <CardContent className="p-4 sm:p-4">
            <div className="flex items-center justify-between">
              {/* 状态筛选 */}
              <div className="flex items-center gap-2">
                {statusConfig.map((config) => {
                  const Icon = config.icon;
                  const isActive = statusFilter === config.value;
                  return (
                    <button
                      key={config.value ?? "all"}
                      onClick={() => setStatusFilter(config.value as FilterValue)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium leading-none transition-all duration-200 ${
                        isActive
                          ? "bg-primary/12 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "" : config.color}`} />
                      {config.label}
                    </button>
                  );
                })}
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={() => setShowGeneratePanel(true)}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                生成邀请码
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 邀请码列表 */}
        <Card className="table-shell">
          <div className="overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredCodes}
              loading={loading}
              emptyIcon={Ticket}
              emptyTitle="暂无邀请码"
              emptyDescription='点击"生成邀请码"创建新的邀请码'
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

      {/* 生成邀请码弹窗 */}
      <Dialog open={showGeneratePanel} onOpenChange={setShowGeneratePanel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              生成新邀请码
            </DialogTitle>
            <DialogDescription>设置生成数量和过期时间</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">生成数量</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                className="h-10"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">过期时间</label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-10"
              />
              <p className="mt-1 text-xs text-muted-foreground">不选择则默认 7 天后过期</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneratePanel(false)}>
              取消
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              确认生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={!!editingCode} onOpenChange={(open) => !open && setEditingCode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑邀请码</DialogTitle>
            <DialogDescription>修改邀请码的过期时间和备注</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">过期时间</label>
              <Input
                type="datetime-local"
                value={editExpiresAt}
                onChange={(e) => setEditExpiresAt(e.target.value)}
                className="h-10"
              />
              <p className="mt-1 text-xs text-muted-foreground">留空则保持原有过期时间</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">备注</label>
              <Input
                type="text"
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                placeholder="请输入备注"
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCode(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-primary hover:bg-primary/90">
              {savingEdit ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
