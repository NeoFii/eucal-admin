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
    <div className="relative min-h-screen overflow-hidden bg-gray-50 lg:flex">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-gray-800 lg:flex lg:w-[48%] lg:flex-col lg:justify-between lg:bg-gray-950 lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.06),transparent_38%),radial-gradient(circle_at_82%_26%,rgba(255,255,255,0.04),transparent_36%)]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-950 shadow-lg shadow-white/10">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Eucal AI</p>
            <p className="text-sm text-white/70">Admin Console</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Intelligent Control Center
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-white xl:text-5xl">
            管理效率与品牌体验
            <span className="mt-2 block bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-white">
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
                  autoComplete="email"
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
                    autoComplete="current-password"
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

