"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { modelCatalogApi } from "@/lib/api/model-catalog";
import type { SupportedModelDetail } from "@/types";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mapCapabilityTags } from "@/lib/model-capabilities";

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [model, setModel] = useState<SupportedModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const capabilityTags = mapCapabilityTags(model?.capability_tags);

  const loadModel = useCallback(async () => {
    try {
      const data = await modelCatalogApi.getModelDetail(slug);
      setModel(data);
    } catch (error) {
      console.error("加载模型失败:", error);
    }
  }, [slug]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadModel();
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
      console.error("删除模型失败:", error);
      toast.error("删除失败", "请重试");
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
    <div className="page-stack max-w-5xl">
      <button
        onClick={() => router.push("/models")}
        className="inline-flex items-center gap-1.5 text-sm leading-none text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回模型列表
      </button>

      <div className="panel p-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {model.vendor.logo_url?.startsWith("http") ? (
            <img
              src={model.vendor.logo_url}
              alt={model.vendor.name}
              className="h-9 w-9 flex-shrink-0 rounded-xl object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-base font-semibold text-muted-foreground">
              {model.vendor.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-foreground">
            {model.vendor.name}/{model.name}
          </h1>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:bg-red-50 hover:text-red-700"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              删除模型
            </Button>
          </div>
        </div>

        {model.summary ? (
          <p className="mb-2 text-sm text-muted-foreground">{model.summary}</p>
        ) : null}

        {model.description ? (
          <div className="markdown-content text-sm text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{model.description}</ReactMarkdown>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {model.context_window ? (
            <span className="whitespace-nowrap">
              上下文：
              <span className="ml-1 font-medium text-foreground">
                {model.context_window >= 1000000
                  ? `${(model.context_window / 1000000).toFixed(0)}M`
                  : model.context_window >= 1000
                    ? `${(model.context_window / 1000).toFixed(0)}K`
                    : model.context_window}{" "}
                tokens
              </span>
            </span>
          ) : null}

          {model.max_output_tokens ? (
            <span className="whitespace-nowrap">
              最大输出：
              <span className="ml-1 font-medium text-foreground">
                {model.max_output_tokens.toLocaleString()} tokens
              </span>
            </span>
          ) : null}

          {model.price_input_per_m_fen != null ? (
            <span className="whitespace-nowrap">
              输入价格：
              <span className="ml-1 font-medium text-foreground">
                ¥{model.price_input_per_m_fen} 分/M
              </span>
            </span>
          ) : null}

          {model.price_output_per_m_fen != null ? (
            <span className="whitespace-nowrap">
              输出价格：
              <span className="ml-1 font-medium text-foreground">
                ¥{model.price_output_per_m_fen} 分/M
              </span>
            </span>
          ) : null}
        </div>

        {capabilityTags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {capabilityTags.map((tag) => (
              <span key={tag} className="inline-flex items-center whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除模型"
        description={`确定要删除模型「${model.vendor.name}/${model.name}」吗？此操作不可撤销。`}
        confirmLabel="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}