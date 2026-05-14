"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Gauge,
  Shield,
  Save,
  AlertTriangle,
  Activity,
  Layers,
  Users,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartCard } from "@/components/dashboard/chart-card";
import {
  RpmBarChart,
  RpmLineChart,
  densifyRpmPoints,
} from "@/components/dashboard/rpm-trend-chart";
import { toast } from "@/hooks/use-toast";
import { useDateTimeRange } from "@/hooks/use-date-time-range";
import { DateTimeRangePicker } from "@/components/date-time-range-picker";
import { useAuthStore } from "@/stores/auth";
import { routingSettingsApi } from "@/lib/api/routing-settings";
import { dashboardApi } from "@/lib/api/dashboard";
import { toShanghaiApiDateTime } from "@/lib/time";
import { getErrorDetail } from "@/lib/errors";
import type {
  RoutingSettingItem,
  RpmTrendData,
} from "@/types";

// ── Helpers ─────────────────────────────────────────────────────

function findRow(
  groups: Record<string, RoutingSettingItem[]>,
  key: string,
): RoutingSettingItem | undefined {
  for (const items of Object.values(groups)) {
    for (const item of items) {
      if (item.key === key) return item;
    }
  }
  return undefined;
}

function parsePositiveInt(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function autoBucketSeconds(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const hours = ms / 3_600_000;
  if (hours <= 2) return 60;
  if (hours <= 48) return 3600;
  return 86400;
}

// ── Page ────────────────────────────────────────────────────────

export default function RateLimitsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Global rate-limit settings ──
  const [defaultUserRpm, setDefaultUserRpm] = useState("");
  const [systemRpmCap, setSystemRpmCap] = useState("");
  const [defaultUserRpmRow, setDefaultUserRpmRow] =
    useState<RoutingSettingItem | null>(null);
  const [systemRpmCapRow, setSystemRpmCapRow] =
    useState<RoutingSettingItem | null>(null);
  const [loadingGlobals, setLoadingGlobals] = useState(true);
  const [savingGlobals, setSavingGlobals] = useState(false);

  const loadGlobals = useCallback(async () => {
    setLoadingGlobals(true);
    try {
      const groups = await routingSettingsApi.getAll();
      const def = findRow(groups, "default_user_rpm");
      const cap = findRow(groups, "system_rpm_cap");
      setDefaultUserRpmRow(def ?? null);
      setSystemRpmCapRow(cap ?? null);
      setDefaultUserRpm(def?.value ?? "");
      setSystemRpmCap(cap?.value ?? "");
    } catch (error) {
      toast.error("加载失败", getErrorDetail(error, "无法读取速率限制设置"));
    } finally {
      setLoadingGlobals(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      void loadGlobals();
    }
  }, [isSuperAdmin, loadGlobals]);

  const handleSaveGlobals = async () => {
    const def = parsePositiveInt(defaultUserRpm);
    const cap = parsePositiveInt(systemRpmCap);
    if (def == null) {
      toast.error("用户默认 RPM 无效", "请输入 ≥1 的正整数");
      return;
    }
    if (cap == null) {
      toast.error("系统硬上限无效", "请输入 ≥1 的正整数");
      return;
    }
    if (def > cap) {
      toast.error(
        "数值不一致",
        `用户默认 RPM(${def}) 不应大于系统硬上限(${cap})。`,
      );
      return;
    }
    const items: { key: string; value: string }[] = [];
    if (defaultUserRpmRow && String(def) !== defaultUserRpmRow.value) {
      items.push({ key: "default_user_rpm", value: String(def) });
    }
    if (systemRpmCapRow && String(cap) !== systemRpmCapRow.value) {
      items.push({ key: "system_rpm_cap", value: String(cap) });
    }
    if (items.length === 0) {
      toast.success("无需保存", "数值未变更");
      return;
    }
    setSavingGlobals(true);
    try {
      await routingSettingsApi.batchUpdate(items);
      toast.success("已保存", "速率限制设置约 60 秒内全节点生效");
      await loadGlobals();
    } catch (error) {
      toast.error("保存失败", getErrorDetail(error, "请稍后重试"));
    } finally {
      setSavingGlobals(false);
    }
  };

  // ── RPM trend chart ──
  const { startTime: trendStart, setStartTime: setTrendStart, endTime: trendEnd, setEndTime: setTrendEnd } = useDateTimeRange();
  const [trend, setTrend] = useState<RpmTrendData | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendWindow, setTrendWindow] = useState<{
    start: Date;
    end: Date;
    bucketSeconds: number;
  } | null>(null);

  const trendApiStart = toShanghaiApiDateTime(trendStart);
  const trendApiEnd = toShanghaiApiDateTime(trendEnd);

  const loadTrend = useCallback(async (startIso: string, endIso: string) => {
    setTrendLoading(true);
    const bucketSeconds = autoBucketSeconds(startIso, endIso);
    try {
      const data = await dashboardApi.getRpmTrend({
        start: startIso,
        end: endIso,
        bucket_seconds: bucketSeconds,
      });
      setTrend(data);
      setTrendWindow({ start: new Date(startIso), end: new Date(endIso), bucketSeconds });
    } catch (error) {
      setTrend(null);
      toast.error("加载失败", getErrorDetail(error, "无法读取 RPM 趋势"));
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      void loadTrend(trendApiStart, trendApiEnd);
    }
  }, [isSuperAdmin, trendApiStart, trendApiEnd, loadTrend]);

  const densePoints = useMemo(() => {
    if (!trend || !trendWindow) return [];
    return densifyRpmPoints(
      trend.points,
      trendWindow.start,
      trendWindow.end,
      trendWindow.bucketSeconds,
    );
  }, [trend, trendWindow]);

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

  const def = parsePositiveInt(defaultUserRpm);
  const cap = parsePositiveInt(systemRpmCap);
  const inconsistent = def != null && cap != null && def > cap;

  return (
    <div className="space-y-6">
      {/* ── Hero 卡片：左控件 + 右说明 ── */}
      <Card className="panel animate-fade-in">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-5 lg:gap-8">
          {/* 左：标题 + 输入 + 一致性提示 + 保存 */}
          <div className="space-y-5 lg:col-span-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200/80 shadow-sm">
                <Gauge className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  速率限制
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  管理全局 RPM 默认值与系统硬上限
                </p>
              </div>
            </div>

            {loadingGlobals ? (
              <div className="py-6">
                <LoadingSpinner text="正在加载速率限制设置..." />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {/* 用户默认 RPM */}
                <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Gauge className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        用户默认 RPM
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {defaultUserRpmRow?.description ??
                          "新注册用户的初始 RPM。修改不影响已注册用户。"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="default-user-rpm" className="text-xs">
                      RPM 值（次/分钟）
                    </Label>
                    <Input
                      id="default-user-rpm"
                      type="number"
                      min={1}
                      step={1}
                      value={defaultUserRpm}
                      onChange={(e) => setDefaultUserRpm(e.target.value)}
                    />
                  </div>
                </div>

                {/* 系统硬上限 */}
                <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        系统 RPM 硬上限
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {systemRpmCapRow?.description ??
                          "任何用户的实际 RPM 不会超过此值。"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="system-rpm-cap" className="text-xs">
                      RPM 值（次/分钟）
                    </Label>
                    <Input
                      id="system-rpm-cap"
                      type="number"
                      min={1}
                      step={1}
                      value={systemRpmCap}
                      onChange={(e) => setSystemRpmCap(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {inconsistent && !loadingGlobals && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  用户默认 RPM ({def}) 大于系统硬上限 ({cap})。新用户实际 RPM 会被钳制到{" "}
                  {cap}。建议保持默认 ≤ 硬上限。
                </span>
              </div>
            )}

            {!loadingGlobals && (
              <div className="flex justify-end">
                <Button
                  onClick={() => void handleSaveGlobals()}
                  disabled={savingGlobals}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {savingGlobals ? "保存中..." : "保存全局设置"}
                </Button>
              </div>
            )}
          </div>

          {/* 右：三级 RPM 体系说明 */}
          <aside className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 text-sm text-blue-900 lg:col-span-2">
            <p className="font-medium">三级 RPM 体系</p>
            <ul className="mt-3 space-y-2.5 text-blue-800/90">
              <li className="leading-relaxed">
                <span className="font-medium">系统硬上限</span>
                {" — "}
                任何用户 RPM 不会超过此值。
              </li>
              <li className="leading-relaxed">
                <span className="font-medium">用户默认 RPM</span>
                {" — "}
                新注册用户的初始 RPM 快照。修改后仅影响后续注册的用户。
              </li>
              <li className="leading-relaxed">
                <span className="font-medium">用户 RPM</span>
                {" — "}
                每个用户的实际值，可在{" "}
                <Link
                  href="/users"
                  className="inline-flex items-center gap-0.5 font-medium underline hover:text-blue-700"
                >
                  用户管理
                  <Users className="h-3.5 w-3.5" />
                </Link>{" "}
                中单独调整。
              </li>
              <li className="leading-relaxed">
                <span className="font-medium">号池账号 RPM</span>
                {" — "}
                上游账号的 RPM，前往{" "}
                <Link
                  href="/pools"
                  className="inline-flex items-center gap-0.5 font-medium underline hover:text-blue-700"
                >
                  号池管理
                  <Layers className="h-3.5 w-3.5" />
                </Link>{" "}
                管理。
              </li>
            </ul>
          </aside>
        </CardContent>
      </Card>

      {/* ── 平台 RPM 趋势：时间范围筛选 ── */}
      <Card className="panel">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">平台 RPM 趋势</p>
            <span className="text-xs text-muted-foreground">
              · 用于观察峰值与判断扩容窗口
            </span>
          </div>
          <DateTimeRangePicker
            startValue={trendStart}
            endValue={trendEnd}
            onStartChange={setTrendStart}
            onEndChange={setTrendEnd}
          />
        </CardContent>
      </Card>

      {/* ── 双图并排：条形图 + 平滑折线图 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="RPM 条形图" loading={trendLoading}>
          <RpmBarChart
            points={densePoints}
            bucketSeconds={trendWindow?.bucketSeconds ?? 60}
          />
        </ChartCard>
        <ChartCard title="RPM 平滑折线图" loading={trendLoading}>
          <RpmLineChart
            points={densePoints}
            bucketSeconds={trendWindow?.bucketSeconds ?? 60}
          />
        </ChartCard>
      </div>
    </div>
  );
}
