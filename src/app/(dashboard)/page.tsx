"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ChartCard } from "@/components/dashboard/chart-card";
import { UserGrowthChart } from "@/components/dashboard/user-growth-chart";
import { ApiCallsChart } from "@/components/dashboard/api-calls-chart";
import { ApiCostChart } from "@/components/dashboard/api-cost-chart";
import { SuccessRateChart } from "@/components/dashboard/success-rate-chart";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useDateTimeRange } from "@/hooks/use-date-time-range";
import { DateTimeRangePicker } from "@/components/date-time-range-picker";
import { toShanghaiApiDateTime } from "@/lib/time";
import { formatYuan } from "@/lib/pricing";
import {
  LayoutDashboard,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react";

type StatGradient = "blue" | "green" | "purple" | "amber";
type StatTrend = "up" | "down" | "neutral";

const GRADIENT_CLASSES: Record<StatGradient, { card: string; icon: string }> = {
  blue: { card: "stat-gradient-blue", icon: "bg-blue-100 text-blue-600" },
  green: { card: "stat-gradient-green", icon: "bg-emerald-100 text-emerald-600" },
  purple: { card: "stat-gradient-purple", icon: "bg-purple-100 text-purple-600" },
  amber: { card: "stat-gradient-amber", icon: "bg-amber-100 text-amber-600" },
};

function StatCard({
  icon: Icon,
  title,
  value,
  sub,
  gradient = "blue",
  trend = "neutral",
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  sub: string;
  gradient?: StatGradient;
  trend?: StatTrend;
  delay?: number;
}) {
  const g = GRADIENT_CLASSES[gradient];
  return (
    <Card className={`panel animate-slide-up ${g.card}`} style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${g.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="text-xl font-semibold tabular-nums text-foreground truncate">
              {value}
            </p>
            {trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
            {trend === "down" && <ArrowDownRight className="h-4 w-4 text-red-500" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { startTime, setStartTime, endTime, setEndTime } = useDateTimeRange();
  const apiStart = toShanghaiApiDateTime(startTime);
  const apiEnd = toShanghaiApiDateTime(endTime);
  const { summary, userGrowth, usageTrends, loading, error } = useDashboardData(apiStart, apiEnd);

  const [growthTab, setGrowthTab] = useState("new");
  const [callsTab, setCallsTab] = useState("trend");
  const [costTab, setCostTab] = useState("revenue");
  const [rateTab, setRateTab] = useState("trend");

  const rangeSelector = (
    <DateTimeRangePicker
      startValue={startTime}
      endValue={endTime}
      onStartChange={setStartTime}
      onEndChange={setEndTime}
    />
  );

  if (loading && !summary) {
    return (
      <div className="page-stack">
        <PageHeader
          icon={LayoutDashboard}
          title="仪表盘"
          subtitle="平台运营概览"
          actions={rangeSelector}
        />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="page-stack">
        <PageHeader
          icon={LayoutDashboard}
          title="仪表盘"
          subtitle="平台运营概览"
          actions={rangeSelector}
        />
        <Card className="panel">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-sm text-muted-foreground">数据加载失败，请检查后端服务是否正常运行</p>
            <p className="text-xs text-muted-foreground/60">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = summary;
  const daily = usageTrends?.daily ?? [];
  const byModel = usageTrends?.by_model ?? [];
  const bucketSeconds = usageTrends?.bucket_seconds ?? 86400;
  const profitInRange = s ? s.revenue_in_range - s.provider_cost_in_range : 0;
  const profitToday = s ? s.revenue_today - s.provider_cost_today : 0;

  return (
    <div className="page-stack">
      <PageHeader
        icon={LayoutDashboard}
        title="仪表盘"
        subtitle="平台运营概览"
        actions={rangeSelector}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          title="总用户数"
          value={s?.total_users?.toLocaleString() ?? "—"}
          sub={s ? `区间新增 ${s.new_users_in_range} · 今日 ${s.new_users_today}` : ""}
          gradient="blue"
          trend={s && s.new_users_in_range > 0 ? "up" : "neutral"}
          delay={0}
        />
        <StatCard
          icon={Activity}
          title="区间调用次数"
          value={s?.requests_in_range?.toLocaleString() ?? "—"}
          sub={s ? `今日 ${s.requests_today.toLocaleString()}` : ""}
          gradient="green"
          trend={s && s.requests_in_range > 0 ? "up" : "neutral"}
          delay={100}
        />
        <StatCard
          icon={DollarSign}
          title="区间收入"
          value={s ? formatYuan(s.revenue_in_range) : "—"}
          sub={s ? `今日 ${formatYuan(s.revenue_today)}` : ""}
          gradient="purple"
          trend={s && s.revenue_in_range > 0 ? "up" : "neutral"}
          delay={200}
        />
        <StatCard
          icon={TrendingUp}
          title="区间利润"
          value={s ? formatYuan(profitInRange) : "—"}
          sub={s ? `今日 ${formatYuan(profitToday)}` : ""}
          gradient="amber"
          trend={s ? (profitInRange > 0 ? "up" : profitInRange < 0 ? "down" : "neutral") : "neutral"}
          delay={300}
        />
      </div>

      <div className="animate-fade-in grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="用户增长"
          tabs={[
            { key: "new", label: "新增用户" },
            { key: "cumulative", label: "累计用户" },
          ]}
          activeTab={growthTab}
          onTabChange={setGrowthTab}
          loading={loading}
        >
          <UserGrowthChart data={userGrowth} activeTab={growthTab} />
        </ChartCard>

        <ChartCard
          title="平台调用次数"
          tabs={[
            { key: "trend", label: "调用趋势" },
            { key: "model", label: "模型调用量" },
          ]}
          activeTab={callsTab}
          onTabChange={setCallsTab}
          loading={loading}
        >
          <ApiCallsChart
            daily={daily}
            byModel={byModel}
            activeTab={callsTab}
            bucketSeconds={bucketSeconds}
          />
        </ChartCard>

        <ChartCard
          title="平台调用花费"
          tabs={[
            { key: "revenue", label: "调用花费" },
            { key: "cost", label: "总成本" },
            { key: "profit", label: "利润" },
          ]}
          activeTab={costTab}
          onTabChange={setCostTab}
          loading={loading}
        >
          <ApiCostChart daily={daily} activeTab={costTab} bucketSeconds={bucketSeconds} />
        </ChartCard>

        <ChartCard
          title="调用状态"
          tabs={[
            { key: "trend", label: "趋势" },
            { key: "rate", label: "成功率/失败率" },
          ]}
          activeTab={rateTab}
          onTabChange={setRateTab}
          loading={loading}
        >
          <SuccessRateChart daily={daily} activeTab={rateTab} bucketSeconds={bucketSeconds} />
        </ChartCard>
      </div>
    </div>
  );
}
