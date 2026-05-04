"use client";

import { useEffect, useRef, useState } from "react";
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
  Database,
  KeyRound,
  Settings,
  Lock,
  Layers,
  Terminal,
  Activity,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { authApi } from "@/lib/api/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { getErrorDetail } from "@/lib/errors";


const sidebarItems = [
  {
    title: "仪表盘",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "兑换码管理",
    href: "/vouchers",
    icon: Ticket,
  },
  {
    title: "模型管理",
    href: "/models",
    icon: Database,
  },
  {
    title: "用户管理",
    href: "/users",
    icon: Users,
  },
  {
    title: "路由设置",
    href: "/routing-settings",
    icon: Settings,
    requiresSuperAdmin: true,
  },
  {
    title: "号池管理",
    href: "/pools",
    icon: Layers,
    requiresSuperAdmin: true,
  },
  {
    title: "管理员管理",
    href: "/admin-users",
    icon: KeyRound,
    requiresSuperAdmin: true,
  },
  {
    title: "管理员审计",
    href: "/admin-audit-logs",
    icon: ScrollText,
    requiresSuperAdmin: true,
  },
  {
    title: "路由监控",
    href: "/route-monitor",
    icon: Activity,
    requiresSuperAdmin: false,
  },
  {
    title: "服务日志",
    href: "/service-logs",
    icon: Terminal,
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
  const routerRef = useRef(router);
  routerRef.current = router;
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
        routerRef.current.push("/login");
      }
    };

    syncCurrentUser();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAuth, setAuth]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 即使后端登出失败，也继续清除前端状态
    }
    clearAuth();
    router.push("/login");
  };

  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return;
    setPwdSaving(true);
    try {
      await authApi.changePassword({ old_password: oldPassword, new_password: newPassword });
      toast.success("密码修改成功", "请重新登录");
      setPwdDialogOpen(false);
      setOldPassword("");
      setNewPassword("");
      clearAuth();
      router.push("/login");
    } catch (error) {
      toast.error("修改失败", getErrorDetail(error, "请重试"));
    } finally {
      setPwdSaving(false);
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const roleLabel = isSuperAdmin ? "超级管理员" : "管理员";

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 ring-1 ring-inset ring-gray-100 shadow-sm">
          <LoadingSpinner text="正在同步管理员身份..." />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-gray-200 bg-white px-4 pb-4 pt-5 lg:flex lg:flex-col">
        <div className="mb-5 flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.55)]">
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
                    ? "bg-gray-950 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.55)]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className={cn(active && "font-medium")}>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3">
          <div className="mb-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{user?.name ?? "管理员"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            <p className="mt-1.5 inline-flex items-center whitespace-nowrap rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
              {roleLabel}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setPwdDialogOpen(true)} className="w-full justify-start text-muted-foreground hover:text-foreground">
              <Lock className="mr-2 h-3.5 w-3.5" />
              修改密码
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-foreground">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              退出登录
            </Button>
          </div>
        </div>
      </aside>

      <div className="relative lg:pl-[272px]">
        <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:hidden">
          <div className="rounded-2xl bg-white px-2 py-2 ring-1 ring-inset ring-gray-100">
            <nav className="flex items-center gap-1 overflow-x-auto px-1 scrollbar-thin">
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
                        : "text-muted-foreground hover:bg-gray-100 hover:text-gray-950"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.title}
                  </Link>
                );
              })}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-auto shrink-0">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </nav>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </main>
      </div>

      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>修改后将自动退出登录</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="old-pwd">旧密码</Label>
              <Input id="old-pwd" type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pwd">新密码</Label>
              <Input id="new-pwd" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少 8 位" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialogOpen(false)}>取消</Button>
            <Button onClick={handleChangePassword} disabled={pwdSaving || !oldPassword || !newPassword}>
              {pwdSaving ? "提交中..." : "确认修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
