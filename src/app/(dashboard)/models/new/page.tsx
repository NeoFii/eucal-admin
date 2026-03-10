"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  testingApi,
  type ModelCreate,
  type Category,
  type Vendor,
} from "@/lib/api/testing";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const emptyForm = (): ModelCreate => ({
  vendor_id: 0,
  slug: "",
  name: "",
  description: "",
  capability_tags: [],
  context_window: undefined,
  max_output_tokens: undefined,
  is_reasoning_model: false,
  sort_order: 0,
  is_active: true,
  categories: [],
});

export default function NewModelPage() {
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ModelCreate>(emptyForm());
  const [tagsInput, setTagsInput] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsResult, categoriesResult] = await Promise.allSettled([
        testingApi.getVendors({ page_size: 200 }),
        testingApi.getCategories(),
      ]);
      if (vendorsResult.status === "fulfilled") {
        const items = vendorsResult.value.items;
        setVendors(items);
        if (items.length > 0) {
          setForm((prev) => ({ ...prev, vendor_id: items[0].id }));
        }
      }
      if (categoriesResult.status === "fulfilled") {
        setCategories(categoriesResult.value);
      }
    } catch (error) {
      console.error("加载元数据失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.vendor_id) return;
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const categoryAssigns = Array.from(selectedCategoryIds).map((id) => ({
      category_id: id,
      sort_order: 0,
    }));
    try {
      await testingApi.createModel({
        ...form,
        capability_tags: tags,
        categories: categoryAssigns,
      });
      toast.success("创建成功", `模型 ${form.name} 已创建`);
      router.push("/models");
    } catch (error) {
      console.error("创建模型失败:", error);
      toast.error("创建失败", "请检查输入或重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack max-w-4xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Link
          href="/models"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回模型列表
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">新增模型</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          创建一个新的 AI 模型，服务商报价请进入模型详情页管理
        </p>
      </div>

      {loading ? (
        <div className="panel py-24 text-center text-muted-foreground text-sm">
          加载中...
        </div>
      ) : (
        <div className="panel p-6">
          <div className="space-y-5">
            {/* 研发商 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                研发商 <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  className="h-10 w-full appearance-none rounded-xl border border-input/90 bg-white/85 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-4 focus:ring-ring/15"
                  value={form.vendor_id}
                  onChange={(e) => setForm({ ...form, vendor_id: Number(e.target.value) })}
                >
                  {vendors.length === 0 ? (
                    <option value={0}>（研发商数据加载失败，请检查后端服务）</option>
                  ) : (
                    vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 显示名称 + Slug */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  显示名称 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：GPT-4o"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Slug <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="例如：gpt-4o"
                />
              </div>
            </div>

            {/* 描述（大文本区） */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                描述
                <span className="ml-1 font-normal text-muted-foreground">
                  （支持 Markdown 格式）
                </span>
              </label>
              <textarea
                className="w-full resize-y rounded-xl border border-input/90 bg-white/85 px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-ring/15 font-mono"
                rows={16}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="输入模型描述，支持 Markdown 格式..."
              />
            </div>

            {/* 能力标签 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                能力标签
                <span className="ml-1 font-normal text-muted-foreground">（逗号分隔）</span>
              </label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例如：chat, vision, tool_calling"
              />
            </div>

            {/* 上下文窗口 + 最大输出 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  上下文窗口（tokens）
                </label>
                <Input
                  type="number"
                  value={form.context_window ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      context_window: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="例如：128000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  最大输出 tokens
                </label>
                <Input
                  type="number"
                  value={form.max_output_tokens ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_output_tokens: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="例如：4096"
                />
              </div>
            </div>

            {/* 排序权重 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  排序权重
                </label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* 推理模型 + 启用 */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_reasoning_model}
                  onChange={(e) => setForm({ ...form, is_reasoning_model: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-foreground">推理模型</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-foreground">启用</span>
              </label>
            </div>

            {/* 所属分类 */}
            {categories.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">所属分类</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        selectedCategoryIds.has(cat.id)
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => router.back()}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name || !form.slug || !form.vendor_id}
              >
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
