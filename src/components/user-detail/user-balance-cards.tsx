"use client";

import {
  Wallet,
  Lock,
  TrendingDown,
  Activity,
  Zap,
} from "lucide-react";
import { formatYuan } from "@/lib/pricing";
import type { UserDetailData } from "@/types";

interface Props {
  detail: UserDetailData;
}

const CARDS = [
  {
    key: "balance",
    label: "余额",
    icon: Wallet,
    format: formatYuan,
    accent: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-500/10 text-blue-600",
    ring: "ring-blue-100",
  },
  {
    key: "frozen_amount",
    label: "冻结金额",
    icon: Lock,
    format: formatYuan,
    accent: "from-amber-500/10 to-amber-600/5",
    iconBg: "bg-amber-500/10 text-amber-600",
    ring: "ring-amber-100",
  },
  {
    key: "used_amount",
    label: "已消费",
    icon: TrendingDown,
    format: formatYuan,
    accent: "from-rose-500/10 to-rose-600/5",
    iconBg: "bg-rose-500/10 text-rose-600",
    ring: "ring-rose-100",
  },
  {
    key: "total_requests",
    label: "总请求数",
    icon: Activity,
    format: (v: number) => v.toLocaleString(),
    accent: "from-indigo-500/10 to-indigo-600/5",
    iconBg: "bg-indigo-500/10 text-indigo-600",
    ring: "ring-indigo-100",
  },
  {
    key: "total_tokens",
    label: "总 Token 数",
    icon: Zap,
    format: (v: number) => v.toLocaleString(),
    accent: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/10 text-emerald-600",
    ring: "ring-emerald-100",
  },
] as const;

export function UserBalanceCards({ detail }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {CARDS.map(({ key, label, icon: Icon, format, accent, iconBg, ring }, i) => (
        <div
          key={key}
          className={`group relative overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-inset ${ring} shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-slide-up`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
          <div className="relative flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{label}</p>
              <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                {format(detail[key])}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
