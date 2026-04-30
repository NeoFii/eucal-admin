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
import { formatYuan } from "@/lib/pricing";
import {
  LayoutDashboard,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

function StatCard({
  icon: Icon,
  title,
  value,
  sub,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="panel">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-xl font-semibold text-foreground truncate">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { summary, userGrowth, usageTrends, loading, error } = useDashboardData();

  const [growthTab, setGrowthTab] = useState("new");
  const [callsTab, setCallsTab] = useState("trend");
  const [costTab, setCostTab] = useState("revenue");
  const [rateTab, setRateTab] = useState("trend");

  if (loading && !summary) {
    return (
      <div className="page-stack">
        <PageHeader
          icon={LayoutDashboard}
          title="仪表盘"
          subtitle="平台运营概览"
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
  const profit = s
    ? s.total_revenue - s.total_provider_cost
    : 0;
  const profitToday = s
    ? s.revenue_today - s.provider_cost_today
    : 0;

  return (
    <div className="page-stack">
      <PageHeader
        icon={LayoutDashboard}
        title="仪表盘"
        subtitle="平台运营概览"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          title="总用户数"
          value={s?.total_users?.toLocaleString() ?? "—"}
          sub={s ? `今日新增 ${s.new_users_today}` : ""}
        />
        <StatCard
          icon={Activity}
          title="总调用次数"
          value={s?.total_requests?.toLocaleString() ?? "—"}
          sub={s ? `今日 ${s.requests_today.toLocaleString()}` : ""}
        />
        <StatCard
          icon={DollarSign}
          title="总收入"
          value={s ? formatYuan(s.total_revenue) : "—"}
          sub={s ? `今日 ${formatYuan(s.revenue_today)}` : ""}
        />
        <StatCard
          icon={TrendingUp}
          title="总利润"
          value={s ? formatYuan(profit) : "—"}
          sub={s ? `今日 ${formatYuan(profitToday)}` : ""}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
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
          <ApiCostChart daily={daily} activeTab={costTab} />
        </ChartCard>

        <ChartCard
          title="成功/错误率"
          tabs={[
            { key: "trend", label: "趋势" },
            { key: "rate", label: "成功率" },
          ]}
          activeTab={rateTab}
          onTabChange={setRateTab}
          loading={loading}
        >
          <SuccessRateChart daily={daily} activeTab={rateTab} />
        </ChartCard>
      </div>
    </div>
  );
}
