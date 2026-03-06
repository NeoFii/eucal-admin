"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Settings, Wrench, Clock } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20">
      {/* 顶部装饰 */}
      <div className="relative h-48 bg-gradient-to-r from-slate-500 via-gray-600 to-slate-700 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2MmgtdnptLTQgOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6bTQtOGgydjJoLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-8 pt-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">系统设置</h1>
              <p className="text-white/80 mt-1">配置和管理系统功能</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-8 -mt-8">
        <Card className="border-0 shadow-xl bg-white">
          <CardContent className="py-20">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
                <Settings className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">功能正在开发中</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                我们正在努力开发更多功能，以提供更好的管理体验，敬请期待！
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>预计上线时间：待定</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
