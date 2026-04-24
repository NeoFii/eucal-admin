"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";
import { formatShanghaiDateTime } from "@/lib/time";
import { LayoutDashboard, Shield, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const roleLabel = user?.role === "super_admin" ? "超级管理员" : "管理员";

  return (
    <div className="page-stack">
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                欢迎回来，{user?.name ?? "管理员"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Eucal AI 管理后台
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LayoutDashboard className="h-4 w-4" />
                <span>当前角色</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">{roleLabel}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>最近登录</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {user?.last_login_at
                  ? formatShanghaiDateTime(user.last_login_at)
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
