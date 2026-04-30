"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModelFormDialog } from "@/components/models/model-form-dialog";
import { modelCatalogApi } from "@/lib/api/model-catalog";
import { poolsApi } from "@/lib/api/pools";
import type {
  SupportedModelDetail,
  SupportedModelCreate,
  SupportedModelUpdate,
  ModelCategoryItem,
  ModelVendorItem,
  AvailableModelSlug,
} from "@/types";
import { toast } from "@/hooks/use-toast";
import { getErrorDetail } from "@/lib/errors";
import { ArrowLeft, Edit3, RefreshCw, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mapCapabilityTags } from "@/lib/model-capabilities";
import { formatFenPerMillionTokens } from "@/lib/pricing";

const formatContextWindow = (tokens?: number | null): string => {
  if (!tokens) return "-";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return String(tokens);
};

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [model, setModel] = useState<SupportedModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ModelCategoryItem[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModelSlug[]>([]);

  const capabilityTags = mapCapabilityTags(model?.capability_tags);

  const loadModel = useCallback(async () => {
    const data = await modelCatalogApi.getModelDetail(slug);
    setModel(data);
  }, [slug]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [, cats, slugs] = await Promise.all([
        loadModel(),
        modelCatalogApi.getAllCategories(),
        poolsApi.getAvailableModels(),
      ]);
      setCategories(cats);
      setAvailableModels(slugs);
      setLoading(false);
    };
    init();
  }, [loadModel]);

  const handleDelete = async () => {
    try {
      await modelCatalogApi.deleteModel(slug);
      toast.success("删除成功", "模型已删除");
      router.push("/models");
    } catch (error) {
      toast.error("删除失败", getErrorDetail(error, "请重试"));
    }
  };

  const handleEditSubmit = async (data: SupportedModelCreate | SupportedModelUpdate) => {
    setSaving(true);
    try {
      await modelCatalogApi.updateModel(slug, data as SupportedModelUpdate);
      toast.success("保存成功", "模型信息已更新");
      setEditOpen(false);
      await loadModel();
    } catch (error) {
      toast.error("保存失败", getErrorDetail(error, "请重试"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="panel py-28">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="panel p-6">
        <p className="text-sm text-muted-foreground">模型不存在或已被删除。</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/models")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="page-stack mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/models")}
          className="inline-flex items-center gap-1.5 text-sm leading-none text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回模型列表
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit3 className="mr-1.5 h-4 w-4" />
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>

      {/* 头部：Logo + 名称 + 标签 + 摘要 */}
      <div className="panel p-6">
        <div className="flex items-center gap-4 mb-4">
          {model.vendor.logo_url?.startsWith("http") ? (
            <img
              src={model.vendor.logo_url}
              alt={model.vendor.name}
              className="h-12 w-12 flex-shrink-0 rounded-xl object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-semibold text-muted-foreground">
              {model.vendor.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">
            {model.vendor.name}
            <span className="mx-2 text-gray-300">/</span>
            {model.name}
          </h1>
        </div>

        {(model.categories.length > 0 || model.is_reasoning_model || capabilityTags.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {model.categories.map((cat) => (
              <span key={cat.key} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                {cat.name}
              </span>
            ))}
            {model.is_reasoning_model && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-700">
                推理模型
              </span>
            )}
            {capabilityTags.map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {model.summary && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{model.summary}</p>
        )}
      </div>

      {/* 关键信息卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-secondary p-5">
          <div className="text-xs text-muted-foreground mb-1">上下文窗口</div>
          <div className="text-2xl font-semibold text-foreground">{formatContextWindow(model.context_window)}</div>
          <div className="text-xs text-muted-foreground mt-1">tokens</div>
        </div>
        <div className="rounded-xl bg-secondary p-5">
          <div className="text-xs text-muted-foreground mb-1">每百万输入价格</div>
          <div className="text-2xl font-semibold text-foreground">
            {model.price_input_per_m_fen != null ? formatFenPerMillionTokens(model.price_input_per_m_fen) : "待配置"}
          </div>
        </div>
        <div className="rounded-xl bg-secondary p-5">
          <div className="text-xs text-muted-foreground mb-1">每百万输出价格</div>
          <div className="text-2xl font-semibold text-foreground">
            {model.price_output_per_m_fen != null ? formatFenPerMillionTokens(model.price_output_per_m_fen) : "待配置"}
          </div>
        </div>
      </div>

      {/* 额外信息 */}
      {(model.max_output_tokens || model.routing_slug) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {model.max_output_tokens && (
            <div className="rounded-xl bg-secondary p-5">
              <div className="text-xs text-muted-foreground mb-1">最大输出</div>
              <div className="text-2xl font-semibold text-foreground">
                {formatContextWindow(model.max_output_tokens)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">tokens</div>
            </div>
          )}
          {model.routing_slug && (
            <div className="rounded-xl bg-secondary p-5">
              <div className="text-xs text-muted-foreground mb-1">路由标识</div>
              <div className="text-lg font-medium text-foreground font-mono">{model.routing_slug}</div>
            </div>
          )}
          <div className="rounded-xl bg-secondary p-5">
            <div className="text-xs text-muted-foreground mb-1">状态</div>
            <div className="mt-1">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${model.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {model.is_active ? "已启用" : "已停用"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 模型描述 */}
      {model.description && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">模型介绍</h2>
          <div className="rounded-xl bg-secondary p-6">
            <div className="markdown-content text-sm text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{model.description}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除模型"
        description={`确定要删除模型「${model.vendor.name}/${model.name}」吗？此操作不可撤销。`}
        confirmLabel="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ModelFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        categories={categories}
        fixedVendor={model.vendor as unknown as ModelVendorItem}
        model={model}
        saving={saving}
        onSubmit={handleEditSubmit}
        availableModels={availableModels}
      />
    </div>
  );
}
