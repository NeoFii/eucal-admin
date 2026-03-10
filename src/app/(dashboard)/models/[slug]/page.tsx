"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  testingApi,
  type ModelDetail,
  type ModelOfferingResponse,
  type OfferingCreate,
  type OfferingUpdate,
  type Provider,
} from "@/lib/api/testing";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, RefreshCw, Edit3, Trash2 } from "lucide-react";

type OfferingFormData = {
  provider_id: number;
  price_input_per_m: number | undefined;
  price_output_per_m: number | undefined;
};

const emptyOfferingForm = (defaultProviderId = 0): OfferingFormData => ({
  provider_id: defaultProviderId,
  price_input_per_m: undefined,
  price_output_per_m: undefined,
});

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [model, setModel] = useState<ModelDetail | null>(null);
  const [offerings, setOfferings] = useState<ModelOfferingResponse[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<ModelOfferingResponse | null>(null);
  const [form, setForm] = useState<OfferingFormData>(emptyOfferingForm());

  const loadModel = useCallback(async () => {
    try {
      const data = await testingApi.getModelDetail(slug);
      setModel(data);
    } catch (error) {
      console.error("加载模型失败:", error);
    }
  }, [slug]);

  const loadOfferings = useCallback(async () => {
    try {
      const data = await testingApi.getModelOfferings(slug);
      setOfferings(data);
    } catch (error) {
      console.error("加载报价失败:", error);
    }
  }, [slug]);

  const loadProviders = useCallback(async () => {
    try {
      const data = await testingApi.getProviders({ page_size: 200 });
      setProviders(data.items);
    } catch (error) {
      console.error("加载服务商失败:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadModel(), loadOfferings(), loadProviders()]);
      setLoading(false);
    };
    init();
  }, [loadModel, loadOfferings, loadProviders]);

  const handleAdd = () => {
    setEditingOffering(null);
    setForm(emptyOfferingForm(providers.find((p) => p.is_active)?.id ?? 0));
    setDialogOpen(true);
  };

  const handleEdit = (offering: ModelOfferingResponse) => {
    setEditingOffering(offering);
    setForm({
      provider_id: offering.provider.id,
      price_input_per_m: offering.price_input_per_m,
      price_output_per_m: offering.price_output_per_m,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.provider_id) return;
    setSaving(true);
    try {
      if (editingOffering) {
        const updateData: OfferingUpdate = {
          price_input_per_m: form.price_input_per_m,
          price_output_per_m: form.price_output_per_m,
        };
        const updated = await testingApi.updateOffering(editingOffering.id, updateData);
        setOfferings((prev) => prev.map((o) => (o.id === editingOffering.id ? updated : o)));
      } else {
        const createData: OfferingCreate = {
          provider_id: form.provider_id,
          price_input_per_m: form.price_input_per_m,
          price_output_per_m: form.price_output_per_m,
        };
        const created = await testingApi.addOffering(slug, createData);
        setOfferings((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("保存报价失败:", error);
      toast.error("保存失败", "请检查输入或重试");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offering: ModelOfferingResponse) => {
    try {
      await testingApi.deleteOffering(offering.id);
      setOfferings((prev) => prev.map((o) => (o.id === offering.id ? { ...o, is_active: false } : o)));
    } catch (error) {
      console.error("废弃报价失败:", error);
      toast.error("操作失败", "请重试");
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
          {model.vendor.logo_url ? (
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
          {model.is_reasoning_model ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">推理模型</span>
          ) : null}
        </div>

        {model.description ? <p className="text-sm leading-relaxed text-muted-foreground">{model.description}</p> : null}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {model.context_window ? (
            <span>
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
            <span>
              最大输出：
              <span className="ml-1 font-medium text-foreground">{model.max_output_tokens.toLocaleString()} tokens</span>
            </span>
          ) : null}
        </div>

        {model.capability_tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {model.capability_tags.map((tag) => (
              <span key={tag} className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="page-stack">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">支持的服务商</h2>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            添加服务商
          </Button>
        </div>

        {offerings.length === 0 ? (
          <div className="panel border-dashed py-12 text-center text-sm text-muted-foreground">
            暂无服务商，点击"添加服务商"开始配置。
          </div>
        ) : (
          <div className="table-shell">
            <table className="w-full">
              <thead className="table-head border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-medium">服务商</th>
                  <th className="px-5 py-3 text-right text-sm font-medium">输入价格 / M</th>
                  <th className="px-5 py-3 text-right text-sm font-medium">输出价格 / M</th>
                  <th className="px-5 py-3 text-left text-sm font-medium">状态</th>
                  <th className="px-5 py-3 text-right text-sm font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {offerings.map((offering) => (
                  <tr
                    key={offering.id}
                    className={offering.is_active ? "table-row" : "bg-secondary/65 text-muted-foreground"}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {offering.provider.logo_url ? (
                          <img
                            src={offering.provider.logo_url}
                            alt={offering.provider.name}
                            className="h-6 w-6 flex-shrink-0 rounded object-contain"
                          />
                        ) : (
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-secondary text-xs font-semibold text-muted-foreground">
                            {offering.provider.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-foreground">{offering.provider.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-foreground">
                      {offering.price_input_per_m != null ? `¥ ${offering.price_input_per_m}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-foreground">
                      {offering.price_output_per_m != null ? `¥ ${offering.price_output_per_m}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {offering.is_active ? (
                        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">启用</span>
                      ) : (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-600">已废弃</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {offering.is_active ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(offering)} title="编辑">
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(offering)}
                              title="废弃"
                              className="text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOffering ? "编辑服务商" : "添加服务商"}</DialogTitle>
            <DialogDescription>
              {editingOffering
                ? `修改 ${editingOffering.provider.name} 的价格配置`
                : "为该模型添加一个服务商"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">服务商 *</label>
              {editingOffering ? (
                <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  {editingOffering.provider.name}
                </div>
              ) : (
                <select
                  className="h-10 w-full rounded-xl border border-input/90 bg-white/85 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-ring/15"
                  value={form.provider_id}
                  onChange={(e) => setForm({ ...form, provider_id: Number(e.target.value) })}
                >
                  {providers
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">输入价格（¥ / 百万 tokens）</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.price_input_per_m ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price_input_per_m: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="如 17.50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">输出价格（¥ / 百万 tokens）</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.price_output_per_m ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price_output_per_m: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="如 52.50"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.provider_id}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
