"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  newsApi,
  type NewsListItem,
  type NewsListResponse,
  type CreateNewsRequest,
  type News,
  type Language,
} from "@/lib/api/news";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  PowerOff,
  Eye,
  Save,
  ArrowLeft,
} from "lucide-react";

// 新闻状态配置
const STATUS_CONFIG = {
  0: { label: "草稿", color: "bg-gray-100 text-gray-700 border-gray-200", icon: FileText },
  1: { label: "已发布", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  2: { label: "已下线", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

// 生成Slug
const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// 语言配置
const LANGUAGE_CONFIG = {
  zh: { label: "中文", flag: "🇨🇳" },
  en: { label: "英文", flag: "🇺🇸" },
};

// 空状态表单
const emptyForm: CreateNewsRequest = {
  title: "",
  slug: "",
  language: "zh",
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
  const [showPreview, setShowPreview] = useState(false);

  // 初始化表单
  useEffect(() => {
    setForm({
      title: news?.title || "",
      slug: news?.slug || "",
      language: news?.language || "zh",
      summary: news?.summary || "",
      cover_image: news?.cover_image || "",
      content: news?.content || "",
      status: news?.status || 0,
      published_at: news?.published_at || "",
    });
  }, [news]);

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      alert("请填写标题、Slug和正文内容");
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div className="h-6 w-px bg-gray-200"></div>
            <h1 className="text-lg font-semibold text-gray-900">
              {isNew ? "新增新闻" : "编辑新闻"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)} className="mr-2">
              <Eye className="w-4 h-4 mr-2" />
              预览
            </Button>
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

      {/* 表单内容 */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* 基础信息 */}
        <div className="bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 pb-2 border-b">基础信息</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">语言 *</label>
              <select
                value={form.language || "zh"}
                onChange={(e) => setForm({ ...form, language: e.target.value as Language })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="zh">🇨🇳 中文</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">标题 *</label>
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Slug *</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="URL路径"
                className="h-10"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Slug 说明</label>
            <p className="text-xs text-gray-500">用于URL路径，建议使用英文和连字符，如 2024-product-launch</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">摘要</label>
            <Textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="新闻摘要（可选）"
              className="h-20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">封面图URL</label>
            <Input
              value={form.cover_image}
              onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="h-10"
            />
            {form.cover_image && (
              <div className="mt-2 relative w-full h-40 rounded-lg overflow-hidden bg-gray-100">
                <img src={form.cover_image} alt="封面预览" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">状态</label>
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
                      : "border-gray-200 hover:border-gray-300"
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
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 正文内容 */}
        <div className="bg-white p-6">
          <div className="flex items-center justify-between pb-4 border-b mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">正文内容</h2>
              <p className="text-xs text-gray-500 mt-1">支持 Markdown 语法</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />
              预览
            </Button>
          </div>
          <Textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="使用 Markdown 格式编写正文内容..."
            className="h-[400px] font-mono text-sm"
          />
        </div>
      </div>

      {/* 预览弹窗 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>预览</DialogTitle>
            <DialogDescription>查看新闻发布后的实际效果</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* 预览头部 */}
            <div className="mb-6">
              {form.cover_image && (
                <div className="w-full h-48 rounded-lg overflow-hidden mb-4 bg-gray-100">
                  <img src={form.cover_image} alt="封面" className="w-full h-full object-cover" />
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{form.title || "标题"}</h1>
              {form.summary && <p className="text-gray-600 mt-2">{form.summary}</p>}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  STATUS_CONFIG[form.status as keyof typeof STATUS_CONFIG]?.color || ""
                }`}>
                  {STATUS_CONFIG[form.status as keyof typeof STATUS_CONFIG]?.label || "草稿"}
                </span>
              </div>
            </div>
            {/* 预览正文 */}
            <div className="markdown-content">
              {form.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic">暂无内容</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 新闻列表页
function NewsList({
  newsList,
  total,
  page,
  pageSize,
  loading,
  languageFilter,
  onLanguageChange,
  onPageChange,
  onEdit,
  onOffline,
  onCreate,
}: {
  newsList: NewsListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  languageFilter: Language | "all";
  onLanguageChange: (lang: Language | "all") => void;
  onPageChange: (page: number) => void;
  onEdit: (news: NewsListItem) => void;
  onOffline: (news: NewsListItem) => void;
  onCreate: () => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20">
      {/* 顶部装饰 */}
      <div className="relative h-48 bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2MmgtdnptLTQgOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-8 pt-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">新闻管理</h1>
              <p className="text-white/80 mt-1">管理新闻内容 · 共 {total} 条新闻</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-8 -mt-8">
        {/* 操作栏 */}
        <div className="bg-white mb-6">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">共 {total} 条新闻</div>
                {/* 语言筛选 */}
                <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
                  <button
                    onClick={() => onLanguageChange("all")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      languageFilter === "all"
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => onLanguageChange("zh")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      languageFilter === "zh"
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    🇨🇳 中文
                  </button>
                  <button
                    onClick={() => onLanguageChange("en")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      languageFilter === "en"
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    🇺🇸 English
                  </button>
                </div>
              </div>
              <Button
                onClick={onCreate}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                新增新闻
              </Button>
            </div>
          </div>
        </div>

        {/* 新闻列表 */}
        <div className="bg-white">
          <div className="overflow-hidden">
            {loading ? (
              <div className="text-center py-16">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="text-gray-500 mt-4">加载中...</p>
              </div>
            ) : newsList.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-lg text-gray-600 mb-2">暂无新闻</p>
                <p className="text-sm text-gray-400 mb-6">点击"新增新闻"创建第一篇文章</p>
                <Button onClick={onCreate} className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  新增新闻
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-orange-50/30 border-b border-gray-100">
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">语言</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">标题</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">Slug</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">状态</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">发布时间</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">创建时间</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {newsList.map((news) => {
                    const status = STATUS_CONFIG[news.status as keyof typeof STATUS_CONFIG];
                    const StatusIcon = status?.icon || FileText;
                    const lang = LANGUAGE_CONFIG[news.language as keyof typeof LANGUAGE_CONFIG];
                    return (
                      <tr key={news.uid} className="border-b border-gray-50 transition-colors hover:bg-orange-50/20">
                        <td className="py-4 px-6">
                          <span className="text-lg">{lang?.flag}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{news.title}</div>
                          {news.summary && (
                            <div className="text-sm text-gray-500 mt-1 max-w-[300px] truncate">{news.summary}</div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <code className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">{news.slug}</code>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${status?.color || "bg-gray-100 text-gray-700"}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {status?.label || "未知"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {news.published_at ? new Date(news.published_at).toLocaleString("zh-CN") : "-"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {new Date(news.created_at).toLocaleString("zh-CN")}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(news)}
                              className="border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              编辑
                            </Button>
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* 分页 */}
            {!loading && newsList.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="text-sm text-gray-500">
                  显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="hover:bg-gray-100"
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-gray-600 px-2">
                    第 {page} 页，共 {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="hover:bg-gray-100"
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
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

  const [newsList, setNewsList] = useState<NewsListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [languageFilter, setLanguageFilter] = useState<Language | "all">("all");

  // 下线确认弹窗
  const [offlineConfirm, setOfflineConfirm] = useState<NewsListItem | null>(null);
  const [offlining, setOfflining] = useState(false);

  // 获取新闻列表
  const fetchNews = async () => {
    setLoading(true);
    try {
      const params: { page: number; page_size: number; language?: Language } = {
        page,
        page_size: pageSize,
      };
      if (languageFilter !== "all") {
        params.language = languageFilter;
      }
      const data: NewsListResponse = await newsApi.getList(params);
      setNewsList(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("获取新闻列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "list") fetchNews();
  }, [page, view, languageFilter]);

  // 清理表单数据：将空字符串转换为 undefined
  const cleanFormData = (data: CreateNewsRequest): CreateNewsRequest => {
    const cleaned: CreateNewsRequest = { ...data };
    // 将空字符串转换为 undefined，让后端使用默认值
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
    setOfflining(true);
    try {
      await newsApi.offline(offlineConfirm.uid);
      await fetchNews();
      setOfflineConfirm(null);
    } catch (error) {
      console.error("下线新闻失败:", error);
      alert("操作失败，请重试");
    } finally {
      setOfflining(false);
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
        newsList={newsList}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        languageFilter={languageFilter}
        onLanguageChange={setLanguageFilter}
        onPageChange={setPage}
        onEdit={handleEdit}
        onOffline={setOfflineConfirm}
        onCreate={() => setView("create")}
      />

      {/* 下线确认弹窗 */}
      <Dialog open={!!offlineConfirm} onOpenChange={(open) => !open && setOfflineConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>下线新闻</DialogTitle>
            <DialogDescription>确定要下线这篇新闻吗？</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{offlineConfirm?.title}</p>
                <p className="text-sm text-gray-600 mt-1">下线后，用户将无法在官网查看此新闻</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfflineConfirm(null)}>
              取消
            </Button>
            <Button onClick={handleOffline} disabled={offlining} className="bg-red-500 hover:bg-red-600 text-white">
              {offlining ? "处理中..." : "确认下线"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
