"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api/auth";
import type { DashboardStats } from "@/types";
import {
  Users,
  Ticket,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Clock,
  CalendarDays,
  Sparkle,
} from "lucide-react";
import Link from "next/link";

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20">
        <div className="relative h-64 bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2MmgtdnptLTQgOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
          <div className="relative max-w-7xl mx-auto px-8 pt-12">
            <div className="animate-pulse">
              <div className="h-10 w-48 bg-white/20 rounded-lg mb-4"></div>
              <div className="h-6 w-64 bg-white/20 rounded"></div>
            </div>
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-8 -mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 w-20 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 w-24 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20">
      {/* 顶部装饰 */}
      <div className="relative h-64 bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2MmgtdnptLTQgOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-8 pt-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Sparkle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">仪表盘</h1>
              <p className="text-white/80 mt-1">欢迎回来，管理员</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-8 -mt-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 用户总数 */}
          <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">用户总数</p>
                  <p className="text-4xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                    {stats?.total_users || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>注册用户</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 邀请码总数 */}
          <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">邀请码总数</p>
                  <p className="text-4xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                    {stats?.total_invitation_codes || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-orange-600 text-sm">
                    <Ticket className="w-4 h-4" />
                    <span>已创建邀请码</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Ticket className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 有效邀请码 */}
          <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">有效邀请码</p>
                  <p className="text-4xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                    {stats?.valid_invitation_codes || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>可使用</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 group cursor-pointer">
            <Link href="/invitation-codes">
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">生成邀请码</h3>
                    <p className="text-gray-500 text-sm">创建新的注册邀请码</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">用户管理</h3>
                  <p className="text-gray-500 text-sm">查看和管理注册用户</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 flex items-center justify-between text-sm text-gray-400 pb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>最后更新：{new Date().toLocaleString("zh-CN")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            <span>{new Date().toLocaleDateString("zh-CN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
