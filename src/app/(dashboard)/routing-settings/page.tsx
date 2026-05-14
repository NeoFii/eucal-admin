"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Layers, Settings, Settings2, Shield, Scale } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ModelCombobox } from "@/components/model-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { poolsApi } from "@/lib/api/pools";
import { routingSettingsApi } from "@/lib/api/routing-settings";
import { formatShanghaiDateTime } from "@/lib/time";
import { useAuthStore } from "@/stores/auth";
import { getErrorDetail } from "@/lib/errors";
import type { RoutingSettingItem, AvailableModelSlug } from "@/types";

const SIMPLE_GROUPS = ["general", "weights"] as const;
const GROUP_LABELS: Record<string, string> = {
  general: "通用设置",
  weights: "权重配置",
};
const GROUP_ICONS: Record<string, typeof Settings2> = {
  general: Settings2,
  weights: Scale,
};

const TIER_LABELS: Record<string, string> = {
  "1": "最高难度",
  "2": "较高难度",
  "3": "中等难度",
  "4": "较低难度",
  "5": "最低难度",
};

const TIER_BADGE_COLORS: Record<string, string> = {
  "1": "bg-red-500",
  "2": "bg-orange-500",
  "3": "bg-yellow-500",
  "4": "bg-green-500",
  "5": "bg-cyan-500",
};

function parseScoreBands(raw: string): Record<number, string> {
  const map: Record<number, string> = {};
  for (const seg of raw.split(",")) {
    const [range, tierStr] = seg.split(":");
    if (range && tierStr) map[parseInt(tierStr.trim())] = range.trim();
  }
  return map;
}

function buildScoreBands(tierRanges: Record<number, string>): string {
  return Object.entries(tierRanges)
    .sort(([, a], [, b]) => {
      const startA = parseFloat(a.split("-")[0]);
      const startB = parseFloat(b.split("-")[0]);
      return startA - startB;
    })
    .map(([tier, range]) => `${range}:${tier}`)
    .join(",");
}

export default function RoutingSettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const [mounted, setMounted] = useState(false);

  const [data, setData] = useState<Record<string, RoutingSettingItem[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<Record<string, Record<string, string>>>({});
  const [tierRanges, setTierRanges] = useState<Record<number, string>>({});
  const [availableModels, setAvailableModels] = useState<AvailableModelSlug[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await routingSettingsApi.getAll();
      setData(result);
      const form: Record<string, Record<string, string>> = {};
      for (const [group, items] of Object.entries(result)) {
        form[group] = {};
        for (const item of items) {
          form[group][item.key] = item.value;
        }
      }
      setFormState(form);
      const scoreBandsItem = (result.score_bands ?? []).find((i) => i.key === "score_bands");
      if (scoreBandsItem) {
        setTierRanges(parseScoreBands(scoreBandsItem.value));
      }
      try {
        const models = await poolsApi.getAvailableModels();
        setAvailableModels(models);
      } catch {
        setAvailableModels([]);
      }
    } catch (e) {
      toast.error("加载失败", getErrorDetail(e, "无法获取路由设置"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const handleFieldChange = (group: string, key: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [group]: { ...prev[group], [key]: value },
    }));
  };

  const handleGroupSave = async (group: string) => {
    if (!data || !data[group]) return;
    const items = data[group];
    const changed = items
      .filter((item) => formState[group]?.[item.key] !== item.value)
      .map((item) => ({ key: item.key, value: formState[group][item.key] }));
    if (changed.length === 0) {
      toast.success("无变更", "没有需要保存的修改");
      return;
    }
    setSaving((prev) => ({ ...prev, [group]: true }));
    try {
      const result = await routingSettingsApi.batchUpdate(changed);
      setData(result);
      const form: Record<string, Record<string, string>> = {};
      for (const [g, items] of Object.entries(result)) {
        form[g] = {};
        for (const item of items) {
          form[g][item.key] = item.value;
        }
      }
      setFormState(form);
      toast.success("保存成功", `已更新 ${changed.length} 项配置`);
    } catch (e) {
      toast.error("保存失败", getErrorDetail(e, "请重试"));
    } finally {
      setSaving((prev) => ({ ...prev, [group]: false }));
    }
  };

  const handleTierSave = async () => {
    setSaving((prev) => ({ ...prev, tiers: true }));
    try {
      const newScoreBands = buildScoreBands(tierRanges);
      const items: { key: string; value: string }[] = [];
      const scoreBandsItem = data?.score_bands?.find((i) => i.key === "score_bands");
      if (scoreBandsItem && scoreBandsItem.value !== newScoreBands) {
        items.push({ key: "score_bands", value: newScoreBands });
      }
      const tierItems = data?.tier_model_map ?? [];
      for (const item of tierItems) {
        const current = formState.tier_model_map?.[item.key];
        if (current !== undefined && current !== item.value) {
          items.push({ key: item.key, value: current });
        }
      }
      if (items.length === 0) {
        toast.success("无变更", "没有需要保存的修改");
        setSaving((prev) => ({ ...prev, tiers: false }));
        return;
      }
      const result = await routingSettingsApi.batchUpdate(items);
      setData(result);
      const form: Record<string, Record<string, string>> = {};
      for (const [g, groupItems] of Object.entries(result)) {
        form[g] = {};
        for (const item of groupItems) {
          form[g][item.key] = item.value;
        }
      }
      setFormState(form);
      const updatedBands = (result.score_bands ?? []).find((i) => i.key === "score_bands");
      if (updatedBands) setTierRanges(parseScoreBands(updatedBands.value));
      toast.success("保存成功", `已更新 ${items.length} 项配置`);
    } catch (e) {
      toast.error("保存失败", getErrorDetail(e, "请重试"));
    } finally {
      setSaving((prev) => ({ ...prev, tiers: false }));
    }
  };

  if (!mounted) return null;
  if (!isSuperAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="无权访问"
        description="此页面仅限超级管理员访问"
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner text="加载路由设置..." />
      </div>
    );
  }

  const tierModelItems = data?.tier_model_map
    ? [...data.tier_model_map].sort((a, b) => a.sort_order - b.sort_order)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title="路由设置"
        subtitle="管理路由策略的权重、分数区间和层级模型映射"
      />

      {SIMPLE_GROUPS.map((group) => {
        const items = data?.[group];
        if (!items || items.length === 0) return null;
        const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
        const GroupIcon = GROUP_ICONS[group] ?? Settings2;
        return (
          <Card key={group}>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                <GroupIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {GROUP_LABELS[group] || group}
                </h3>
              </div>
              <div className="space-y-4">
                {sorted.map((item) => (
                  <div key={item.key} className="space-y-1.5">
                    <Label htmlFor={item.key}>{item.label}</Label>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                    <Input
                      id={item.key}
                      type={item.value_type === "float" || item.value_type === "int" ? "number" : "text"}
                      step={item.value_type === "float" ? "0.01" : undefined}
                      value={formState[group]?.[item.key] ?? ""}
                      onChange={(e) => handleFieldChange(group, item.key, e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      更新于 {formatShanghaiDateTime(item.updated_at)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <Button
                  onClick={() => handleGroupSave(group)}
                  disabled={saving[group]}
                >
                  {saving[group] ? "保存中..." : "保存"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Combined: score bands + tier model map */}
      {tierModelItems.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">难度分层与模型映射</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  每个层级对应一个难度分数区间，请求会根据推理得分路由到对应层级的模型
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-gray-50/50 p-4">
              <div className="space-y-0">
                {tierModelItems.map((item, idx) => {
                  const tierNum = item.key.replace("tier_", "").replace("_model", "");
                  const tierInt = parseInt(tierNum);
                  const range = tierRanges[tierInt] ?? "";
                  const badgeColor = TIER_BADGE_COLORS[tierNum] ?? "bg-gray-500";
                  return (
                    <div key={item.key}>
                      <div className={`tier-${tierNum} rounded-lg border border-gray-200 bg-white p-3`}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white ${badgeColor}`}>
                            {tierNum}
                          </span>
                          <span className="text-sm font-medium">{item.label}</span>
                          {TIER_LABELS[tierNum] && (
                            <span className={`tier-badge-${tierNum} rounded-full px-2 py-0.5 text-[11px] font-medium`}>
                              {TIER_LABELS[tierNum]}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">分数区间</Label>
                            <Input
                              value={range}
                              onChange={(e) => setTierRanges((prev) => ({ ...prev, [tierInt]: e.target.value }))}
                              placeholder="如 9-10"
                              className="text-sm"
                            />
                          </div>
                          <ArrowRight className="mb-2.5 h-4 w-4 text-muted-foreground" />
                          <div className="space-y-1">
                            <Label className="text-xs">调用模型</Label>
                            <ModelCombobox
                              value={formState.tier_model_map?.[item.key] ?? ""}
                              onChange={(v) => handleFieldChange("tier_model_map", item.key, v)}
                              availableModels={availableModels}
                              placeholder="选择或输入模型名称"
                            />
                            {(() => {
                              const currentModel = formState.tier_model_map?.[item.key] ?? "";
                              if (!currentModel.trim()) return null;
                              const info = availableModels.find((m) => m.model_slug === currentModel);
                              if (info) {
                                return (
                                  <span className="text-[11px] text-muted-foreground">
                                    号池：{info.pool_names.join("、")}
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 text-[11px] text-red-600">
                                  ⚠ 无可用通道，保存将被拒绝
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          更新于 {formatShanghaiDateTime(item.updated_at)}
                        </p>
                      </div>
                      {idx < tierModelItems.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="h-4 border-l-2 border-dashed border-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={handleTierSave} disabled={saving.tiers}>
                {saving.tiers ? "保存中..." : "保存"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
