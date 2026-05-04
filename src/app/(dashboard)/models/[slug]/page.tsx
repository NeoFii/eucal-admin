"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModelFormDialog } from "@/components/models/model-form-dialog";
import { VendorLogo } from "@/components/vendor-logo";
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
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Edit3,
  Layers,
  MessageSquare,
  Archive,
  ArchiveRestore,
  RefreshCw,
  Route,
} from "lucide-react";
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

  const handleArchive = async () => {
    try {
      await modelCatalogApi.archiveModel(slug);
      toast.success("已归档", "模型已移入归档列表，可在归档中恢复");
      router.push("/models");
    } catch (error) {
      toast.error("归档失败", getErrorDetail(error, "请重试"));
    }
  };

  const handleToggleActive = async () => {
    if (!model) return;
    try {
      await modelCatalogApi.updateModel(slug, { is_active: !model.is_active });
      toast.success("状态已更新", `模型已${model.is_active ? "归档" : "恢复"}`);
      await loadModel();
    } catch (error) {
      toast.error("操作失败", getErrorDetail(error, "请重试"));
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
          {model.is_active ? (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
              onClick={handleArchive}
            >
              <Archive className="mr-1.5 h-4 w-4" />
              归档
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={handleToggleActive}
            >
              <ArchiveRestore className="mr-1.5 h-4 w-4" />
              恢复
            </Button>
          )}
        </div>
      </div>

      {/* 头部：Logo + 名称 + 标签 + 摘要 */}
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 via-gray-100/60 to-gray-50 p-6 pb-5">
          <div className="flex items-center gap-4 mb-4">
            <VendorLogo
              name={model.vendor.name}
              logoUrl={model.vendor.logo_url}
              size={56}
              radius="md"
              className="shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">
                {model.vendor.name}
                <span className="mx-2 text-gray-300">/</span>
                {model.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${model.is_active ? "text-emerald-600" : "text-gray-500"}`}>
                  <span className={`h-2 w-2 rounded-full ${model.is_active ? "bg-emerald-500 animate-pulse-ring" : "bg-gray-400"}`} />
                  {model.is_active ? "已启用" : "已停用"}
                </span>
              </div>
            </div>
          </div>

          {(model.categories.length > 0 || model.is_reasoning_model || capabilityTags.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {model.categories.map((cat) => (
                <span key={cat.key} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {cat.name}
                </span>
              ))}
              {model.is_reasoning_model && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                  推理模型
                </span>
              )}
              {capabilityTags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-200/80 px-3 py-1 text-xs text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {model.summary && (
          <div className="border-l-3 border-gray-300 px-6 py-4">
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{model.summary}</p>
          </div>
        )}
      </div>

      {/* 关键信息卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat-gradient-blue relative overflow-hidden rounded-xl p-5">
          <Layers className="absolute right-3 top-3 h-8 w-8 text-blue-200/60" />
          <div className="text-xs font-medium text-blue-600/80 mb-1">上下文窗口</div>
          <div className="text-3xl font-bold tabular-nums text-blue-900">{formatContextWindow(model.context_window)}</div>
          <div className="text-xs text-blue-600/60 mt-1">tokens</div>
        </div>
        <div className="stat-gradient-green relative overflow-hidden rounded-xl p-5">
          <ArrowDownToLine className="absolute right-3 top-3 h-8 w-8 text-emerald-200/60" />
          <div className="text-xs font-medium text-emerald-600/80 mb-1">每百万输入价格</div>
          <div className="text-3xl font-bold tabular-nums text-emerald-900">
            {model.price_input_per_m_fen != null ? formatFenPerMillionTokens(model.price_input_per_m_fen) : "待配置"}
          </div>
        </div>
        <div className="stat-gradient-purple relative overflow-hidden rounded-xl p-5">
          <ArrowUpFromLine className="absolute right-3 top-3 h-8 w-8 text-violet-200/60" />
          <div className="text-xs font-medium text-violet-600/80 mb-1">每百万输出价格</div>
          <div className="text-3xl font-bold tabular-nums text-violet-900">
            {model.price_output_per_m_fen != null ? formatFenPerMillionTokens(model.price_output_per_m_fen) : "待配置"}
          </div>
        </div>
      </div>

      {/* 额外信息 */}
      {(model.max_output_tokens || model.routing_slug) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {model.max_output_tokens && (
            <div className="stat-gradient-amber relative overflow-hidden rounded-xl p-5">
              <MessageSquare className="absolute right-3 top-3 h-8 w-8 text-amber-200/60" />
              <div className="text-xs font-medium text-amber-600/80 mb-1">最大输出</div>
              <div className="text-3xl font-bold tabular-nums text-amber-900">
                {formatContextWindow(model.max_output_tokens)}
              </div>
              <div className="text-xs text-amber-600/60 mt-1">tokens</div>
            </div>
          )}
          {model.routing_slug && (
            <div className="rounded-xl bg-gray-900 p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Route className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-500">路由标识</span>
              </div>
              <div className="rounded-lg bg-gray-800 px-3 py-2">
                <code className="text-sm font-mono text-emerald-400">{model.routing_slug}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 模型描述 */}
      {model.description && (
        <div className="panel p-6">
          <h2 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-semibold text-foreground">
            模型介绍
          </h2>
          <div className="markdown-content text-sm text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{model.description}</ReactMarkdown>
          </div>
        </div>
      )}

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
