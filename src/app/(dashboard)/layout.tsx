"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  ScrollText,
  LayoutDashboard,
  Ticket,
  LogOut,
  Shield,
  Users,
  FileText,
  Database,
  Blocks,
  Activity,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { authApi } from "@/lib/api/auth";

const sidebarItems = [
  {
    title: "仪表盘",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "邀请码管理",
    href: "/invitation-codes",
    icon: Ticket,
  },
  {
    title: "新闻管理",
    href: "/news",
    icon: FileText,
  },
  {
    title: "模型管理",
    href: "/models",
    icon: Database,
  },
  {
    title: "服务商管理",
    href: "/providers",
    icon: Blocks,
  },
  {
    title: "评测",
    href: "/benchmark",
    icon: Activity,
  },
  {
    title: "管理员管理",
    href: "/admin-users",
    icon: Users,
    requiresSuperAdmin: true,
  },
  {
    title: "管理员审计",
    href: "/admin-audit-logs",
    icon: ScrollText,
    requiresSuperAdmin: true,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setAuth, clearAuth } = useAuthStore();
  const [authReady, setAuthReady] = useState(false);
  const isSuperAdmin = user?.role === "super_admin";
  const visibleSidebarItems = sidebarItems.filter((item) => !item.requiresSuperAdmin || isSuperAdmin);

  useEffect(() => {
    let cancelled = false;

    const syncCurrentUser = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (cancelled) {
          return;
        }
        setAuth(currentUser);
        setAuthReady(true);
      } catch {
        if (cancelled) {
          return;
        }
        clearAuth();
        setAuthReady(true);
        router.push("/login");
      }
    };

    syncCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [clearAuth, router, setAuth]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 即使后端登出失败，也继续清除前端状态
    }
    clearAuth();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const currentTitle = sidebarItems.find((item) => isActive(item.href))?.title ?? "管理后台";
  const isDashboard = pathname === "/";
  const now = new Date();
  const dashboardTimeLabel = `最后更新：${now.toLocaleString("zh-CN")} · ${now.toLocaleDateString("zh-CN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;

  const roleLabel = isSuperAdmin ? "超级管理员" : "管理员";

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/85 p-8 shadow-panel backdrop-blur-sm">
          <LoadingSpinner text="正在同步管理员身份..." />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-white/70 bg-white/75 px-4 pb-4 pt-5 shadow-panel backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-soft">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-soft">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Eucal AI</p>
            <p className="text-xs text-muted-foreground">管理后台</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-auto pr-1 scrollbar-thin">
          {visibleSidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm leading-none transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-soft"
                    : "text-muted-foreground hover:bg-orange-50/80 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className={cn(active && "font-medium")}>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-soft">
          <div className="mb-3 rounded-xl border border-border/70 bg-orange-50/55 p-3">
            <p className="truncate text-sm font-medium text-foreground">{user?.name ?? "管理员"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            <p className="mt-2 inline-flex rounded-full border border-primary/15 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
              {roleLabel}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </Button>
        </div>
      </aside>

      <div className="relative lg:pl-[272px]">
        <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
          <div className="glass rounded-2xl border border-white/80 px-4 shadow-soft sm:px-6">
            <div className="flex h-16 items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
                  <span className="shrink-0">Eucal AI 控制台</span>
                  <span className="shrink-0 text-border">/</span>
                  <span className="shrink-0 text-sm font-semibold text-foreground">{currentTitle}</span>
                  {isDashboard ? <span className="min-w-0 truncate">{dashboardTimeLabel}</span> : null}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="lg:hidden">
                <LogOut className="mr-1.5 h-4 w-4" />
                退出
              </Button>
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-white/75 bg-white/75 px-2 py-2 backdrop-blur-sm lg:hidden">
            <nav className="flex gap-1 overflow-x-auto px-1 scrollbar-thin">
              {visibleSidebarItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs leading-none whitespace-nowrap transition-colors",
                      active
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:bg-orange-50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
