"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  CreditCard,
  Key,
  KeyRound,
  Minus,
  Plus,
  Users,
} from "lucide-react";
import type { Column } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { userManagementApi } from "@/lib/api/user-management";
import { getErrorDetail } from "@/lib/errors";
import type {
  UserDetailData,
  UserTransactionItem,
  UserApiKeyItem,
} from "@/types";

const STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  0: { label: "已禁用", className: "border-red-200 bg-red-50 text-red-700" },
  1: { label: "正常", className: "border-green-200 bg-green-50 text-green-700" },
};

const TX_TYPE_LABELS: Record<number, string> = {
  1: "充值",
  2: "消费",
  3: "调账",
  4: "退款",
  5: "冻结",
  6: "解冻",
};

function formatYuan(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

type Tab = "transactions" | "apikeys";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uid = Number(params.uid);

  const [detail, setDetail] = useState<UserDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const [tab, setTab] = useState<Tab>("transactions");

  // Transaction state
  const [txList, setTxList] = useState<UserTransactionItem[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<UserApiKeyItem[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  // Dialog state
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupRemark, setTopupRemark] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustRemark, setAdjustRemark] = useState("");

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const data = await userManagementApi.getDetail(uid);
      setDetail(data);
    } catch (error) {
      toast.error("加载用户详情失败", getErrorDetail(error, "请稍后重试"));
    } finally {
      setLoadingDetail(false);
    }
  }, [uid]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const data = await userManagementApi.getTransactions(uid, { page: txPage, page_size: 10 });
      setTxList(data.items);
      setTxTotal(data.total);
    } catch (error) {
      toast.error("加载交易记录失败", getErrorDetail(error, "请稍后重试"));
    } finally {
      setTxLoading(false);
    }
  }, [uid, txPage]);

  const loadApiKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const data = await userManagementApi.getApiKeys(uid);
      setApiKeys(data);
    } catch (error) {
      toast.error("加载API密钥失败", getErrorDetail(error, "请稍后重试"));
    } finally {
      setKeysLoading(false);
    }
  }, [uid]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);
  useEffect(() => { if (tab === "transactions") void loadTransactions(); }, [tab, loadTransactions]);
  useEffect(() => { if (tab === "apikeys") void loadApiKeys(); }, [tab, loadApiKeys]);

  const handleToggleStatus = async () => {
    if (!detail) return;
    const nextStatus = detail.status === 1 ? 0 : 1;
    try {
      await userManagementApi.updateStatus(uid, { status: nextStatus as 0 | 1 });
      toast.success(nextStatus === 1 ? "已启用用户" : "已禁用用户", `${detail.email} 状态已更新`);
      setStatusConfirmOpen(false);
      await loadDetail();
    } catch (error) {
      toast.error("状态更新失败", getErrorDetail(error, "请稍后重试"));
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast.error("密码不能为空", "请输入新密码");
      return;
    }
    try {
      await userManagementApi.resetPassword(uid, { new_password: newPassword });
      toast.success("密码已重置", "用户需要使用新密码登录");
      setResetOpen(false);
      setNewPassword("");
    } catch (error) {
      toast.error("重置失败", getErrorDetail(error, "请检查密码规则后重试"));
    }
  };

  const handleTopup = async () => {
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) {
      toast.error("金额无效", "请输入正整数（单位：分）");
      return;
    }
    try {
      await userManagementApi.topup(uid, { amount, remark: topupRemark || undefined });
      toast.success("充值成功", `已充值 ${formatYuan(amount)}`);
      setTopupOpen(false);
      setTopupAmount("");
      setTopupRemark("");
      await loadDetail();
      if (tab === "transactions") await loadTransactions();
    } catch (error) {
      toast.error("充值失败", getErrorDetail(error, "请稍后重试"));
    }
  };

  const handleAdjust = async () => {
    const amount = Number(adjustAmount);
    if (!amount) {
      toast.error("金额无效", "请输入调账金额（单位：分，可为负数）");
      return;
    }
    if (!adjustRemark.trim()) {
      toast.error("备注必填", "调账操作必须填写备注");
      return;
    }
    try {
      await userManagementApi.adjustBalance(uid, { amount, remark: adjustRemark });
      toast.success("调账成功", `已调整 ${formatYuan(amount)}`);
      setAdjustOpen(false);
      setAdjustAmount("");
      setAdjustRemark("");
      await loadDetail();
      if (tab === "transactions") await loadTransactions();
    } catch (error) {
      toast.error("调账失败", getErrorDetail(error, "请稍后重试"));
    }
  };

  const handleDisableKey = async (keyId: number) => {
    try {
      await userManagementApi.disableApiKey(uid, keyId);
      toast.success("已禁用密钥", "该API密钥已被禁用");
      await loadApiKeys();
    } catch (error) {
      toast.error("禁用失败", getErrorDetail(error, "请稍后重试"));
    }
  };

  const txColumns = useMemo<Column<UserTransactionItem>[]>(
    () => [
      {
        key: "id", header: "ID",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-muted-foreground",
        render: (t) => t.id,
      },
      {
        key: "type", header: "类型",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm",
        render: (t) => TX_TYPE_LABELS[t.type] ?? `类型${t.type}`,
      },
      {
        key: "amount", header: "金额",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm font-medium",
        render: (t) => (
          <span className={t.amount >= 0 ? "text-green-600" : "text-red-600"}>
            {t.amount >= 0 ? "+" : ""}{formatYuan(t.amount)}
          </span>
        ),
      },
      {
        key: "balance_after", header: "变动后余额",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-muted-foreground",
        render: (t) => formatYuan(t.balance_after),
      },
      {
        key: "remark", header: "备注",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-muted-foreground",
        render: (t) => t.remark || "-",
      },
      {
        key: "created_at", header: "时间",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-muted-foreground",
        render: (t) => new Date(t.created_at).toLocaleString("zh-CN"),
      },
    ],
    [],
  );

  const keyColumns = useMemo<Column<UserApiKeyItem>[]>(
    () => [
      {
        key: "name", header: "名称",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm font-medium text-foreground",
        render: (k) => k.name,
      },
      {
        key: "key_prefix", header: "密钥前缀",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm font-mono text-muted-foreground",
        render: (k) => `${k.key_prefix}...`,
      },
      {
        key: "status", header: "状态",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center",
        render: (k) => {
          const cfg = STATUS_CONFIG[k.status] ?? STATUS_CONFIG[0];
          return (
            <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${cfg.className}`}>
              {cfg.label}
            </span>
          );
        },
      },

      {
        key: "quota", header: "配额",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-muted-foreground",
        render: (k) => k.quota_mode === 0 ? "无限制" : `${k.quota_used}/${k.quota_limit}`,
      },
      {
        key: "last_used_at", header: "最近使用",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center text-sm text-muted-foreground",
        render: (k) => (k.last_used_at ? new Date(k.last_used_at).toLocaleString("zh-CN") : "从未使用"),
      },
      {
        key: "actions", header: "操作",
        headerClassName: "px-6 py-4 text-center text-sm font-semibold",
        className: "px-6 py-4 text-center",
        render: (k) =>
          k.status === 1 ? (
            <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700" onClick={() => handleDisableKey(k.id)}>
              <Ban className="mr-1 h-3.5 w-3.5" />
              禁用
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">已禁用</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (loadingDetail) {
    return (
      <Card>
        <CardContent className="p-8">
          <LoadingSpinner text="正在加载用户详情..." />
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <div className="page-stack">
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            用户不存在或加载失败。
            <Button variant="outline" className="ml-4" onClick={() => router.push("/users")}>返回列表</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG[0];

  return (
    <div className="page-stack">
      <PageHeader
        icon={Users}
        title="用户详情"
        subtitle={detail.email}
        actions={
          <Button variant="outline" onClick={() => router.push("/users")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回列表
          </Button>
        }
      />

      {/* User info card */}
      <Card className="panel">
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="邮箱" value={detail.email} />
            <InfoItem label="状态">
              <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${statusCfg.className}`}>
                {statusCfg.label}
              </span>
            </InfoItem>
            <InfoItem label="余额" value={formatYuan(detail.balance)} />
            <InfoItem label="冻结金额" value={formatYuan(detail.frozen_amount)} />
            <InfoItem label="已消费" value={formatYuan(detail.used_amount)} />
            <InfoItem label="总请求数" value={detail.total_requests.toLocaleString()} />
            <InfoItem label="总Token数" value={detail.total_tokens.toLocaleString()} />
            <InfoItem label="最近登录" value={detail.last_login_at ? new Date(detail.last_login_at).toLocaleString("zh-CN") : "从未登录"} />
            <InfoItem label="登录IP" value={detail.last_login_ip || "-"} />
            <InfoItem label="注册时间" value={new Date(detail.created_at).toLocaleString("zh-CN")} />
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <Card className="panel">
        <CardContent className="flex flex-wrap items-center gap-2 p-5">
          <Button variant="outline" onClick={() => setStatusConfirmOpen(true)}
            className={detail.status === 1
              ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              : "border-green-200 text-green-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
            }
          >
            {detail.status === 1 ? <><Ban className="mr-1 h-4 w-4" />禁用用户</> : <><CheckCircle className="mr-1 h-4 w-4" />启用用户</>}
          </Button>
          <Button variant="outline" onClick={() => { setResetOpen(true); setNewPassword(""); }}>
            <KeyRound className="mr-1 h-4 w-4" />重置密码
          </Button>
          <Button variant="outline" onClick={() => { setTopupOpen(true); setTopupAmount(""); setTopupRemark(""); }}>
            <Plus className="mr-1 h-4 w-4" />充值
          </Button>
          <Button variant="outline" onClick={() => { setAdjustOpen(true); setAdjustAmount(""); setAdjustRemark(""); }}>
            <Minus className="mr-1 h-4 w-4" />调账
          </Button>
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="flex gap-2">
        <Button variant={tab === "transactions" ? "default" : "outline"} size="sm" onClick={() => setTab("transactions")}>
          <CreditCard className="mr-1 h-4 w-4" />交易记录
        </Button>
        <Button variant={tab === "apikeys" ? "default" : "outline"} size="sm" onClick={() => setTab("apikeys")}>
          <Key className="mr-1 h-4 w-4" />API 密钥
        </Button>
      </div>

      {/* Tab content */}
      {tab === "transactions" && (
        <Card className="table-shell">
          <div className="overflow-hidden">
            <DataTable
              columns={txColumns}
              data={txList}
              loading={txLoading}
              loadingText="正在加载交易记录..."
              emptyIcon={CreditCard}
              emptyTitle="暂无交易记录"
              emptyDescription="该用户还没有任何交易记录。"
              rowKey={(t) => t.id}
              page={txPage}
              pageSize={10}
              total={txTotal}
              onPageChange={setTxPage}
              showPageInfo
            />
          </div>
        </Card>
      )}

      {tab === "apikeys" && (
        <Card className="table-shell">
          <div className="overflow-hidden">
            <DataTable
              columns={keyColumns}
              data={apiKeys}
              loading={keysLoading}
              loadingText="正在加载API密钥..."
              emptyIcon={Key}
              emptyTitle="暂无API密钥"
              emptyDescription="该用户还没有创建任何API密钥。"
              rowKey={(k) => k.id}
            />
          </div>
        </Card>
      )}

      {/* Status toggle dialog */}
      <ConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        title={detail.status === 1 ? "禁用用户" : "启用用户"}
        description={detail.status === 1 ? `确定要禁用 ${detail.email} 吗？禁用后该用户将无法使用服务。` : `确定要启用 ${detail.email} 吗？`}
        confirmLabel="确认"
        onConfirm={handleToggleStatus}
      />

      {/* Reset password dialog */}
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={(open) => { if (!open) { setResetOpen(false); setNewPassword(""); } }}
        title="重置用户密码"
        description={`为 ${detail.email} 设置新密码。`}
        confirmLabel="确认重置"
        onConfirm={handleResetPassword}
      >
        <div className="space-y-2">
          <Label htmlFor="reset-pwd">新密码</Label>
          <Input id="reset-pwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="请输入新密码" />
        </div>
      </ConfirmDialog>

      {/* Topup dialog */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>充值</DialogTitle>
            <DialogDescription>为 {detail.email} 充值余额。金额单位为分。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="topup-amount">金额（分）</Label>
              <Input id="topup-amount" type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="例如 10000 = ¥100.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topup-remark">备注（可选）</Label>
              <Input id="topup-remark" value={topupRemark} onChange={(e) => setTopupRemark(e.target.value)} placeholder="充值备注" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupOpen(false)}>取消</Button>
            <Button onClick={() => void handleTopup()}>确认充值</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust balance dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>调账</DialogTitle>
            <DialogDescription>为 {detail.email} 调整余额。金额单位为分，可为负数。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adjust-amount">金额（分）</Label>
              <Input id="adjust-amount" type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="正数增加，负数扣减" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-remark">备注（必填）</Label>
              <Input id="adjust-remark" value={adjustRemark} onChange={(e) => setAdjustRemark(e.target.value)} placeholder="请填写调账原因" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>取消</Button>
            <Button onClick={() => void handleAdjust()}>确认调账</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{children ?? value}</div>
    </div>
  );
}