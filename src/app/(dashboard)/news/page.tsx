"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import {
  newsApi,
  type NewsListItem,
  type CreateNewsRequest,
  type News,
} from "@/lib/api/news";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  PowerOff,
  Eye,
  Save,
  ArrowLeft,
  Globe,
  Trash2,
} from "lucide-react";

// 新闻状态配置
const STATUS_CONFIG = {
  0: { label: "草稿", color: "bg-secondary text-secondary-foreground border-border", icon: FileText },
  1: { label: "已发布", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  2: { label: "已下线", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

// 生成Slug
const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^一-龥a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// 空状态表单
const emptyForm: CreateNewsRequest = {
  title: "",
  slug: "",
  summary: "",
  cover_image: "",
  content: "",
  status: 0,
  published_at: "",
};

// 新闻编辑页面组件
function NewsEditor({
  news,
  isNew,
  onSave,
  onCancel,
}: {
  news: News | null;
  isNew: boolean;
  onSave: (data: CreateNewsRequest) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CreateNewsRequest>(emptyForm);
  const [saving, setSaving] = useState(false);

  // 初始化表单
  useEffect(() => {
    setForm({
      title: news?.title || "",
      slug: news?.slug || "",
      summary: news?.summary || "",
      cover_image: news?.cover_image || "",
      content: news?.content || "",
      status: (news?.status ?? 0) as 0 | 1 | 2,
      published_at: news?.published_at || "",
    });
  }, [news]);

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      toast.error("请填写必填字段", "标题、Slug和正文内容不能为空");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div className="h-6 w-px bg-border"></div>
            <h1 className="text-lg font-semibold text-foreground">
              {isNew ? "新增新闻" : "编辑新闻"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.slug || !form.content}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </div>

      {/* 左右分栏内容区 */}
      <div className="flex gap-6 px-4 py-6 sm:px-6 items-start">
        {/* 左侧编辑区 */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* 基础信息 */}
          <div className="panel space-y-4 p-6">
            <h2 className="border-b border-border pb-2 text-base font-semibold text-foreground">基础信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">标题 *</label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                      slug: form.slug || generateSlug(e.target.value),
                    })
                  }
                  placeholder="请输入新闻标题"
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Slug *</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="URL路径"
                  className="h-10"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Slug 说明</label>
              <p className="text-xs text-muted-foreground">用于URL路径，建议使用英文和连字符，如 2024-product-launch</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">摘要</label>
              <Textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="新闻摘要（可选）"
                className="h-20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">封面图URL</label>
              <Input
                value={form.cover_image}
                onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="h-10"
              />
              {form.cover_image && (
                <div className="relative mt-2 h-40 w-full overflow-hidden rounded-xl bg-secondary">
                  <Image src={form.cover_image} alt="封面预览" fill className="object-cover" unoptimized />
                </div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">状态</label>
              <div className="flex gap-4">
                {[
                  { value: 0, label: "草稿", desc: "保存为草稿，不对外展示" },
                  { value: 1, label: "已发布", desc: "立即对外展示" },
                  { value: 2, label: "已下线", desc: "不再对外展示" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      form.status === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={form.status === option.value}
                      onChange={() => setForm({ ...form, status: option.value as 0 | 1 | 2 })}
                      className="w-4 h-4 text-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 正文内容 */}
          <div className="panel p-6">
            <div className="mb-4 border-b border-border pb-4">
              <h2 className="text-base font-semibold text-foreground">正文内容</h2>
              <p className="mt-1 text-xs text-muted-foreground">支持 Markdown 语法</p>
            </div>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="使用 Markdown 格式编写正文内容..."
              className="h-[400px] font-mono text-sm"
            />
          </div>
        </div>

        {/* 右侧实时预览区 */}
        <div className="flex-1 min-w-0 sticky top-20">
          <div className="panel overflow-y-auto max-h-[calc(100vh-5.5rem)] scrollbar-thin">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">实时预览</span>
            </div>
            <div className="p-5">
              {form.cover_image && (
                <div className="relative mb-4 h-44 w-full overflow-hidden rounded-xl bg-secondary">
                  <Image src={form.cover_image} alt="封面" fill className="object-cover" unoptimized />
                </div>
              )}
              <h1 className="text-xl font-bold text-foreground leading-snug">
                {form.title || <span className="text-muted-foreground italic">标题</span>}
              </h1>
              {form.summary && (
                <p className="mt-2 text-sm text-muted-foreground">{form.summary}</p>
              )}
              <div className="mt-3 mb-4">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${
                  STATUS_CONFIG[form.status as keyof typeof STATUS_CONFIG]?.color || ""
                }`}>
                  {STATUS_CONFIG[form.status as keyof typeof STATUS_CONFIG]?.label || "草稿"}
                </span>
              </div>
              <div className="border-t border-border pt-4 markdown-content text-sm">
                {form.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
                ) : (
                  <p className="italic text-muted-foreground">暂无内容...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 新闻列表页
function NewsList({
  items,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onEdit,
  onOffline,
  onPublish,
  onDelete,
  onCreate,
}: {
  items: NewsListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onEdit: (news: NewsListItem) => void;
  onOffline: (news: NewsListItem) => void;
  onPublish: (news: NewsListItem) => void;
  onDelete: (news: NewsListItem) => void;
  onCreate: () => void;
}) {
  const columns = useMemo<Column<NewsListItem>[]>(() => [
    {
      key: "title",
      header: "标题",
      render: (news) => (
        <div>
          <div className="font-medium text-foreground">{news.title}</div>
          {news.summary && (
            <div className="mt-1 max-w-[300px] truncate text-sm text-muted-foreground">{news.summary}</div>
          )}
        </div>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      render: (news) => (
        <code className="inline-flex items-center rounded bg-secondary px-2 py-1 text-sm text-muted-foreground">{news.slug}</code>
      ),
    },
    {
      key: "status",
      header: "状态",
      render: (news) => {
        const status = STATUS_CONFIG[news.status as keyof typeof STATUS_CONFIG];
        const StatusIcon = status?.icon || FileText;
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium leading-none ${status?.color || "bg-secondary text-secondary-foreground"}`}
          >
            <StatusIcon className="w-3 h-3" />
            {status?.label || "未知"}
          </span>
        );
      },
    },
    {
      key: "published_at",
      header: "发布时间",
      render: (news) => (
        <div className="flex items-center gap-2 text-sm leading-none text-muted-foreground">
          <Clock className="w-4 h-4" />
          {news.published_at ? new Date(news.published_at).toLocaleString("zh-CN") : "-"}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "创建时间",
      render: (news) => (
        <div className="flex items-center gap-2 text-sm leading-none text-muted-foreground">
          <Clock className="w-4 h-4" />
          {new Date(news.created_at).toLocaleString("zh-CN")}
        </div>
      ),
    },
    {
      key: "actions",
      header: "操作",
      render: (news) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(news)}
            className="text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            编辑
          </Button>
          {(news.status === 0 || news.status === 2) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPublish(news)}
              className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
            >
              <Globe className="w-3 h-3 mr-1" />
              {news.status === 0 ? "发布" : "上线"}
            </Button>
          )}
          {news.status === 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOffline(news)}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              <PowerOff className="w-3 h-3 mr-1" />
              下线
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(news)}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            删除
          </Button>
        </div>
      ),
    },
  ], [onEdit, onPublish, onOffline, onDelete]);

  return (
    <div className="page-stack">
      {/* 顶部装饰 */}
      <PageHeader
        icon={FileText}
        title="新闻管理"
        subtitle={`管理新闻内容 · 共 ${total} 条新闻`}
      />

      <div className="page-stack">
        {/* 操作栏 */}
        <div className="panel">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">共 {total} 条新闻</div>
              <Button
                onClick={onCreate}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                新增新闻
              </Button>
            </div>
          </div>
        </div>

        {/* 新闻列表 */}
        <div className="table-shell">
          <div className="overflow-hidden">
            <DataTable
              columns={columns}
              data={items}
              loading={loading}
              emptyIcon={FileText}
              emptyTitle="暂无新闻"
              emptyDescription='点击"新增新闻"创建第一篇文章'
              rowKey={(item) => item.uid}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={onPageChange}
              showPageInfo
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 主组件
export default function NewsPage() {
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [currentNews, setCurrentNews] = useState<News | null>(null);

  // 下线/删除确认弹窗
  const [offlineConfirm, setOfflineConfirm] = useState<NewsListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<NewsListItem | null>(null);

  const { items, total, page, loading, setPage, refresh } = usePaginatedData<NewsListItem>(
    (params) => newsApi.getList(params),
    { pageSize: DEFAULT_PAGE_SIZE, deps: [view], onError: (e) => console.error("获取新闻列表失败:", e) },
  );

  // 清理表单数据：将空字符串转换为 undefined
  const cleanFormData = (data: CreateNewsRequest): CreateNewsRequest => {
    const cleaned: CreateNewsRequest = { ...data };
    if (cleaned.summary === "") cleaned.summary = undefined;
    if (cleaned.cover_image === "") cleaned.cover_image = undefined;
    if (cleaned.published_at === "") cleaned.published_at = undefined;
    return cleaned;
  };

  // 创建新闻
  const handleCreate = async (data: CreateNewsRequest) => {
    await newsApi.create(cleanFormData(data));
    setView("list");
  };

  // 编辑新闻
  const handleEdit = async (news: NewsListItem) => {
    const detail = await newsApi.getDetail(news.uid);
    setCurrentNews(detail);
    setView("edit");
  };

  // 保存编辑
  const handleUpdate = async (data: CreateNewsRequest) => {
    if (!currentNews) return;
    await newsApi.update(currentNews.uid, cleanFormData(data));
    setView("list");
    setCurrentNews(null);
  };

  // 下线新闻
  const handleOffline = async () => {
    if (!offlineConfirm) return;
    try {
      await newsApi.offline(offlineConfirm.uid);
      await refresh();
      setOfflineConfirm(null);
    } catch (error) {
      console.error("下线新闻失败:", error);
      toast.error("操作失败", "请重试");
    }
  };

  // 发布/上线新闻
  const handlePublish = async (news: NewsListItem) => {
    try {
      await newsApi.update(news.uid, { status: 1 });
      await refresh();
      toast.success("操作成功", `《${news.title}》已${news.status === 0 ? "发布" : "上线"}`);
    } catch (error) {
      console.error("发布新闻失败:", error);
      toast.error("操作失败", "请重试");
    }
  };

  // 删除新闻
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await newsApi.destroy(deleteConfirm.uid);
      await refresh();
      setDeleteConfirm(null);
      toast.success("删除成功", `《${deleteConfirm.title}》已删除`);
    } catch (error) {
      console.error("删除新闻失败:", error);
      toast.error("操作失败", "请重试");
    }
  };

  // 渲染视图
  if (view === "create") {
    return <NewsEditor news={null} isNew={true} onSave={handleCreate} onCancel={() => setView("list")} />;
  }

  if (view === "edit") {
    return (
      <NewsEditor
        news={currentNews}
        isNew={false}
        onSave={handleUpdate}
        onCancel={() => {
          setView("list");
          setCurrentNews(null);
        }}
      />
    );
  }

  return (
    <>
      <NewsList
        items={items}
        total={total}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
        loading={loading}
        onPageChange={setPage}
        onEdit={handleEdit}
        onOffline={setOfflineConfirm}
        onPublish={handlePublish}
        onDelete={setDeleteConfirm}
        onCreate={() => setView("create")}
      />

      {/* 下线确认弹窗 */}
      <ConfirmDialog
        open={!!offlineConfirm}
        onOpenChange={(open) => !open && setOfflineConfirm(null)}
        title="下线新闻"
        description={`确定要下线《${offlineConfirm?.title}》吗？下线后，用户将无法在官网查看此新闻。`}
        variant="destructive"
        confirmLabel="确认下线"
        onConfirm={handleOffline}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="删除新闻"
        description={`此操作不可恢复，确定要删除《${deleteConfirm?.title}》吗？`}
        variant="destructive"
        confirmLabel="确认删除"
        onConfirm={handleDelete}
      />
    </>
  );
}