"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth";
import { Shield, LogIn, Loader2, Eye, EyeOff, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.login({ email, password });
      const userInfo = await authApi.getCurrentUser();
      setAuth(userInfo);
      router.push("/");
    } catch (err: unknown) {
      const axiosErr = err as import("axios").AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "登录失败，请检查邮箱和密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAF8F5] lg:flex">
      <div className="pointer-events-none absolute -left-16 top-8 h-72 w-72 rounded-full bg-orange-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-8 top-16 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

      <section className="relative hidden min-h-screen overflow-hidden border-r border-white/60 lg:flex lg:w-[48%] lg:flex-col lg:justify-between lg:bg-gradient-to-br lg:from-slate-900 lg:via-slate-800 lg:to-slate-900 lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(249,115,22,0.36),transparent_38%),radial-gradient(circle_at_82%_26%,rgba(59,130,246,0.3),transparent_36%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.2),transparent_30%)]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Eucal AI</p>
            <p className="text-sm text-white/70">Admin Console</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Intelligent Control Center
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-white xl:text-5xl">
            管理效率与品牌体验
            <span className="mt-2 block bg-gradient-to-r from-orange-200 via-orange-100 to-sky-200 bg-clip-text text-transparent">
              在同一界面统一达成
            </span>
          </h1>
          <p className="text-base leading-relaxed text-white/75">
            统一管理后台数据，提升操作效率。
          </p>
        </div>

        <div className="relative z-10 text-sm text-white/50">
          &copy; {new Date().getFullYear()} Eucal AI
        </div>
      </section>

      <section className="relative flex min-h-screen flex-1 flex-col px-8 py-12 sm:px-12 lg:px-16">
        {/* 移动端顶部品牌 */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Eucal AI</p>
            <p className="text-xs text-muted-foreground">Admin Console</p>
          </div>
        </div>

        {/* 居中表单区 */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-10">
              <h2 className="text-4xl font-semibold tracking-tight text-foreground">欢迎回来</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">账号</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder=""
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder=""
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="mt-2 h-11 w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    登录
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

