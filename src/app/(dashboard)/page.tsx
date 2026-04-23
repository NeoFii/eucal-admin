"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardStats } from "@/types";
import {
  Ticket,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";

const statsConfig = [
  {
    key: "total_invitation_codes" as const,
    title: "邀请码总数",
    hint: "累计生成邀请码",
    icon: Ticket,
  },
  {
    key: "valid_invitation_codes" as const,
    title: "有效邀请码",
    hint: "可直接使用",
    icon: CheckCircle,
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardApi.getStats();
        setStats(data);
      } catch (error) {
        console.error("获取统计数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="page-stack">
        <Card>
          <CardContent className="p-8">
            <LoadingSpinner text="正在加载仪表盘数据..." />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Card className="bg-glow">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">仪表盘</h1>
            <p className="mt-1 text-sm text-muted-foreground">欢迎回来，当前为后台核心数据概览。</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/20 to-primary/5 px-3 py-2 text-sm text-primary shadow-soft">
            <div className="flex items-center gap-2 leading-none">
              <TrendingUp className="h-4 w-4" />
              <span>系统状态正常</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {statsConfig.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="card-hover">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-semibold text-foreground">{stats?.[item.key] || 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
