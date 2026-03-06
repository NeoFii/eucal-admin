"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  invitationCodeApi,
  type InvitationCode,
  type InvitationCodeListResponse,
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
  ChevronDown,
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
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
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
  const fetchCodes = async () => {
    setLoading(true);
    try {
      const data: InvitationCodeListResponse = await invitationCodeApi.getList({
        page,
        page_size: pageSize,
      });
      setCodes(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("获取邀请码列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [page]);

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
      await fetchCodes();
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
      await fetchCodes();
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
      await fetchCodes();
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
    { value: null, label: "全部", icon: Filter, color: "text-gray-600" },
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20">
      {/* 顶部装饰 */}
      <div className="relative h-48 bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2MmgtdnptLTQgOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-8 pt-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Ticket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">邀请码管理</h1>
              <p className="text-white/80 mt-1">管理用户注册邀请码 · 共 {total} 个邀请码</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-8 -mt-8">
        {/* 操作栏 */}
        <Card className="border-0 shadow-xl bg-white mb-6">
          <CardContent className="p-4">
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "" : config.color}`} />
                      {config.label}
                    </button>
                  );
                })}
              </div>

              {/* 生成按钮 */}
              <div className="relative">
                <Button
                  onClick={() => setShowGeneratePanel(!showGeneratePanel)}
                  className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  生成邀请码
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showGeneratePanel ? "rotate-180" : ""}`} />
                </Button>

                {/* 生成面板 */}
                {showGeneratePanel && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">生成新邀请码</p>
                        <p className="text-xs text-gray-500">设置生成数量和过期时间</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">生成数量</label>
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
                        <label className="text-sm font-medium text-gray-700 mb-2 block">过期时间</label>
                        <Input
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="h-10"
                        />
                        <p className="text-xs text-gray-500 mt-1">不选择则默认 7 天后过期</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleGenerate}
                          disabled={generating}
                          className="flex-1 bg-primary hover:bg-primary/90 text-white"
                        >
                          {generating ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          确认生成
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowGeneratePanel(false)}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 邀请码列表 */}
        <Card className="border-0 shadow-xl bg-white">
          <div className="overflow-hidden">
            {loading ? (
              <div className="text-center py-16">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="text-gray-500 mt-4">加载中...</p>
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-lg text-gray-600 mb-2">暂无邀请码</p>
                <p className="text-sm text-gray-400 mb-6">点击"生成邀请码"创建新的邀请码</p>
                <Button
                  onClick={() => setShowGeneratePanel(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  生成邀请码
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-orange-50/30 border-b border-gray-100">
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">邀请码</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">状态</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">创建时间</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">过期时间</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">备注</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((code, index) => (
                    <tr
                      key={code.id}
                      className={`border-b border-gray-50 transition-colors animate-fade-in ${
                        !isCodeValid(code) ? "bg-red-50/30" : "hover:bg-orange-50/20"
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <code className="font-mono text-sm text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            {code.code}
                          </code>
                          <button
                            onClick={() => handleCopy(code.code)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="复制"
                          >
                            {copiedCode === code.code ? (
                              <CopyCheck className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusClass(code)}`}
                        >
                          {getStatusIcon(code)}
                          {getStatusText(code)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {new Date(code.created_at).toLocaleString("zh-CN")}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {code.expires_at ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {new Date(code.expires_at).toLocaleString("zh-CN")}
                          </div>
                        ) : (
                          <span className="text-green-600 font-medium">永不过期</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 max-w-[200px] truncate">
                        {code.remark || <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {/* 编辑按钮 - 仅未使用的可以编辑 */}
                          {code.status === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(code)}
                              className="border-gray-200 text-gray-600 hover:bg-gray-50"
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
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
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
                              className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                            >
                              <Power className="w-3 h-3 mr-1" />
                              启用
                            </Button>
                          )}
                          {code.status === 1 && (
                            <span className="text-gray-400 text-sm px-3">已使用</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 分页 */}
            {!loading && filteredCodes.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="text-sm text-gray-500">
                  显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="hover:bg-gray-100"
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="hover:bg-gray-100"
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 编辑弹窗 */}
      <Dialog open={!!editingCode} onOpenChange={(open) => !open && setEditingCode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑邀请码</DialogTitle>
            <DialogDescription>修改邀请码的过期时间和备注</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">过期时间</label>
              <Input
                type="datetime-local"
                value={editExpiresAt}
                onChange={(e) => setEditExpiresAt(e.target.value)}
                className="h-10"
              />
              <p className="text-xs text-gray-500 mt-1">留空则保持原有过期时间</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">备注</label>
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
