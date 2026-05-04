"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  Search,
  Shield,
  Terminal,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { useAuthStore } from "@/stores/auth";
import {
  serviceLogsApi,
  type ServiceLogEntry,
  type ServiceLogResult,
} from "@/lib/api/service-logs";

const ALL_SERVICES = [
  { value: "", label: "全部服务" },
  { value: "admin-service", label: "admin-service" },
  { value: "user-service", label: "user-service" },
  { value: "router-service", label: "router-service" },
  { value: "inference-service", label: "inference-service" },
];

const LEVEL_OPTIONS = [
  { value: "", label: "全部级别" },
  { value: "DEBUG", label: "DEBUG" },
  { value: "INFO", label: "INFO" },
  { value: "WARNING", label: "WARNING" },
  { value: "ERROR", label: "ERROR" },
  { value: "CRITICAL", label: "CRITICAL" },
];

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "text-gray-500",
  INFO: "text-blue-600",
  WARNING: "text-amber-600",
  ERROR: "text-red-600",
  CRITICAL: "text-red-800 font-bold",
};

const LEVEL_BADGE_CLASSES: Record<string, string> = {
  DEBUG: "log-badge log-badge-debug",
  INFO: "log-badge log-badge-info",
  WARNING: "log-badge log-badge-warning",
  ERROR: "log-badge log-badge-error",
  CRITICAL: "log-badge log-badge-critical",
};

const SERVICE_DOT_COLORS: Record<string, string> = {
  "admin-service": "bg-violet-500",
  "user-service": "bg-blue-500",
  "router-service": "bg-emerald-500",
  "inference-service": "bg-amber-500",
};

const SERVICE_ACTIVE_CLASSES: Record<string, string> = {
  "admin-service": "bg-violet-600 text-white shadow-sm",
  "user-service": "bg-blue-600 text-white shadow-sm",
  "router-service": "bg-emerald-600 text-white shadow-sm",
  "inference-service": "bg-amber-600 text-white shadow-sm",
};

// Event family → chip color. Keep semantics aligned with the backend log_event
// callsites; unmatched events fall through to EVENT_DEFAULT_CLASS so new event
// names degrade gracefully (visible but neutral).
const EVENT_FAMILY_CLASSES: Record<string, string> = {
  request:  "bg-slate-100 text-slate-700 border-slate-300",
  chat:     "bg-purple-100 text-purple-700 border-purple-300",
  classify: "bg-cyan-100 text-cyan-700 border-cyan-300",
  auth:     "bg-amber-100 text-amber-700 border-amber-300",
  config:   "bg-emerald-100 text-emerald-700 border-emerald-300",
  service:  "bg-gray-100 text-gray-600 border-gray-300",
};
const EVENT_DEFAULT_CLASS = "bg-gray-50 text-gray-500 border-gray-200";

function eventFamily(event: string): keyof typeof EVENT_FAMILY_CLASSES | null {
  if (!event || event === "log") return null;
  if (event.startsWith("request"))  return "request";
  if (event.startsWith("chat"))     return "chat";
  if (event.startsWith("classify")) return "classify";
  if (/^(admin|user)?(Login|Logout|Register|Password|Token|CodeLogin)/.test(event)) return "auth";
  if (event.startsWith("config"))   return "config";
  if (event.startsWith("service")) return "service";
  return null;
}

const AUTO_REFRESH_INTERVAL = 5000;
const MAX_LOGS_IN_MEMORY = 500;
const SCROLL_THRESHOLD = 200;

/**
 * 增量合并日志:用 ${service}-${seq} 去重(seq 在每个服务的 ring buffer 内单调),
 * 按 timestamp 倒序,封顶 cap 条防止内存膨胀。incoming 中已存在的条目会覆盖
 * existing 的同 key 条目,以便后端字段补齐时取最新版本。
 */
function mergeLogs(
  existing: ServiceLogEntry[],
  incoming: ServiceLogEntry[],
  cap = MAX_LOGS_IN_MEMORY,
): ServiceLogEntry[] {
  const map = new Map<string, ServiceLogEntry>();
  for (const e of existing) map.set(`${e.service}-${e.seq}`, e);
  for (const e of incoming) map.set(`${e.service}-${e.seq}`, e);
  const merged = Array.from(map.values());
  merged.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  return merged.slice(0, cap);
}


function formatLogTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function ServiceLogsPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [service, setService] = useState("");
  const [level, setLevel] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [logs, setLogs] = useState<ServiceLogEntry[]>([]);
  const [pendingNewLogs, setPendingNewLogs] = useState<ServiceLogEntry[]>([]);
  const [serviceResults, setServiceResults] = useState<ServiceLogResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserScrolledRef = useRef(false);
  const scrollAnchorRef = useRef<{ y: number; height: number } | null>(null);


  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 全量替换:首次加载、过滤条件变化、翻页、手动刷新都走这里。
  // 同时清空 pending buffer——上一过滤条件下缓存的新日志在新条件下不一定还匹配。
  const fetchInitial = useCallback(async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await serviceLogsApi.getLogs({
        service: service || undefined,
        level: level || undefined,
        search: appliedSearch || undefined,
        page,
        page_size: pageSize,
      });
      setLogs(data.items ?? []);
      setPendingNewLogs([]);
      setServiceResults(data.results ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
      setPendingNewLogs([]);
      setServiceResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, service, level, appliedSearch, page, pageSize]);

  // 增量轮询:只在 page=1 时调度。结果按是否安全合并分流——
  // 用户在交互(已展开/已滚动/标签隐藏)时塞进 pendingNewLogs 等手动 flush。
  const pollOnce = useCallback(async () => {
    if (!isSuperAdmin) return;
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const data = await serviceLogsApi.getLogs({
        service: service || undefined,
        level: level || undefined,
        search: appliedSearch || undefined,
        page: 1,
        page_size: pageSize,
      });
      const incoming = data.items ?? [];
      const safeMerge =
        expandedRows.size === 0 &&
        !isUserScrolledRef.current &&
        (typeof document === "undefined" || !document.hidden);

      if (safeMerge) {
        // 抓滚动锚点,useLayoutEffect 会在 DOM 更新后还原
        scrollAnchorRef.current = {
          y: window.scrollY,
          height: document.documentElement.scrollHeight,
        };
        setLogs((prev) => mergeLogs(prev, incoming));
        setServiceResults(data.results ?? []);
        setTotal(data.total ?? 0);
      } else {
        setPendingNewLogs((prev) => mergeLogs(prev, incoming));
      }
    } catch {
      // 静默失败,下个 tick 再试
    }
  }, [isSuperAdmin, service, level, appliedSearch, pageSize, expandedRows]);

  const flushPending = useCallback(() => {
    if (pendingNewLogs.length === 0) return;
    setLogs((prev) => mergeLogs(prev, pendingNewLogs));
    setPendingNewLogs([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pendingNewLogs]);

  // 过滤条件 / 翻页变化 → 整体替换
  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // 自动刷新轮询,仅在 page=1 时启用(其他页是历史浏览,刷新无意义且会破坏分页)
  useEffect(() => {
    if (autoRefresh && page === 1) {
      timerRef.current = setInterval(pollOnce, AUTO_REFRESH_INTERVAL);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoRefresh, page, pollOnce]);

  // 跟踪用户是否已滚动远离顶部
  useEffect(() => {
    const onScroll = () => {
      isUserScrolledRef.current = window.scrollY > SCROLL_THRESHOLD;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 增量合并后保持滚动位置:用 (scrollY, scrollHeight) 快照计算高度差还原
  useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current;
    if (!anchor) return;
    const delta = document.documentElement.scrollHeight - anchor.height;
    if (delta > 0 && anchor.y > 0) {
      window.scrollTo({ top: anchor.y + delta, behavior: "instant" as ScrollBehavior });
    }
    scrollAnchorRef.current = null;
  }, [logs]);

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };


  if (!isSuperAdmin) {
    return (
      <div className="page-stack">
        <PageHeader
          icon={Terminal}
          title="服务日志"
          subtitle="仅超级管理员可查看各微服务运行日志。"
        />
        <Card className="table-shell">
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="当前账号没有访问权限"
              description="只有 super_admin 才能查看服务日志。"
              action={
                <Button asChild>
                  <Link href="/">返回仪表盘</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="page-stack">
      <PageHeader
        icon={Terminal}
        title="服务日志"
        subtitle={`实时查看各微服务运行日志，共 ${total} 条。`}
        actions={
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <Pause className="mr-1.5 h-4 w-4" />
            ) : (
              <Play className="mr-1.5 h-4 w-4" />
            )}
            {autoRefresh ? "暂停刷新" : "开启刷新"}
          </Button>
        }
      />


      {/* Service tabs */}
      <Card className="panel">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {ALL_SERVICES.map((o) => {
              const active = service === o.value;
              const result = serviceResults.find((r) => r.service === o.value);
              const dot = o.value ? SERVICE_DOT_COLORS[o.value] ?? "bg-gray-400" : null;
              const unreachable = result && !result.reachable;
              const activeClass = o.value && active
                ? SERVICE_ACTIVE_CLASSES[o.value] ?? "bg-gray-950 text-white shadow-sm"
                : active
                  ? "bg-gray-950 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-950";
              return (
                <button
                  key={o.value}
                  onClick={() => { setService(o.value); setPage(1); }}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${activeClass}`}
                >
                  {dot && (
                    <span className={`h-2 w-2 rounded-full ${unreachable ? "bg-red-400" : active ? "bg-white/80" : dot}`} />
                  )}
                  <span className="font-medium">{o.label}</span>
                  {result && (
                    <span className={`text-xs ${active ? "text-white/70" : "text-muted-foreground"}`}>
                      {unreachable ? "不可达" : `${result.entries.length}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Level tabs + search */}
      <Card className="panel">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {LEVEL_OPTIONS.map((o) => {
                const active = level === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => { setLevel(o.value); setPage(1); }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="搜索日志内容..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-64"
              />
              <Button variant="outline" size="sm" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Pending new logs pill — 用户在阅读/已滚动时,新日志先暂存,点这里手动加载 */}
      {pendingNewLogs.length > 0 && (
        <div className="sticky top-2 z-30 flex justify-center pointer-events-none">
          <button
            onClick={flushPending}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-emerald-700/30 transition-all hover:bg-emerald-700 hover:shadow-xl"
          >
            <ArrowUp className="h-4 w-4" />
            {pendingNewLogs.length} 条新日志，点击加载
          </button>
        </div>
      )}

      {/* Log entries */}
      <Card className="table-shell overflow-hidden">
        {/* Terminal header */}
        <div className="terminal-header">
          <span className="terminal-dot bg-red-500" />
          <span className="terminal-dot bg-yellow-500" />
          <span className="terminal-dot bg-green-500" />
          <span className="ml-2 text-xs font-medium text-gray-400">
            {service || "all-services"} — 日志输出
          </span>
          {autoRefresh && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-ring" />
              LIVE
            </span>
          )}
        </div>
        <div className="overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              正在加载日志...
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={Terminal}
              title="暂无日志"
              description="当前筛选条件下没有日志记录。"
            />
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="table-head sticky top-0 z-10">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">时间</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">服务</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">级别</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">事件</th>
                    <th className="px-4 py-3 text-left font-medium">消息</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry) => {
                    const rowKey = `${entry.service}-${entry.seq}`;
                    const isExpanded = expandedRows.has(rowKey);
                    const msg = entry.message ?? "";
                    const extra = Object.fromEntries(
                      Object.entries(entry).filter(
                        ([k]) => !["seq", "timestamp", "service", "level", "logger", "event", "message", "traceId", "spanId", "requestId", "uid", "env", "durationMs", "error", "exception"].includes(k),
                      ),
                    );
                    return (
                      <Fragment key={rowKey}>
                        <tr
                          className="table-row cursor-pointer"
                          onClick={() => toggleRow(rowKey)}
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              {formatLogTime(entry.timestamp)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${SERVICE_DOT_COLORS[entry.service] ?? "bg-gray-400"}`} />
                              <span className="text-xs font-medium">{entry.service}</span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <span className={LEVEL_BADGE_CLASSES[entry.level] ?? "log-badge log-badge-debug"}>
                              {entry.level}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            {entry.event === "log" ? (
                              <span className="text-xs italic text-muted-foreground/50">log</span>
                            ) : (
                              <span className={`inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${
                                EVENT_FAMILY_CLASSES[eventFamily(entry.event) ?? ""] ?? EVENT_DEFAULT_CLASS
                              }`}>
                                {entry.event}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            <span className={isExpanded ? "whitespace-pre-wrap break-all" : "line-clamp-1"}>
                              {msg || "-"}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-gray-800 bg-gray-950">
                            <td colSpan={5} className="px-4 py-3">
                              <div className="grid gap-3 text-xs md:grid-cols-2">
                                <div className="space-y-1 text-gray-300">
                                  <p><span className="text-gray-500">Logger:</span> {entry.logger}</p>
                                  <p><span className="text-gray-500">Trace ID:</span> <span className="font-mono text-cyan-400">{entry.traceId ?? "-"}</span></p>
                                  <p><span className="text-gray-500">Span ID:</span> <span className="font-mono text-cyan-400">{entry.spanId ?? "-"}</span></p>
                                  <p><span className="text-gray-500">Request ID:</span> <span className="font-mono text-cyan-400">{entry.requestId ?? "-"}</span></p>
                                  {entry.uid && <p><span className="text-gray-500">UID:</span> <span className="text-amber-400">{entry.uid}</span></p>}
                                  {entry.env && <p><span className="text-gray-500">Env:</span> {entry.env}</p>}
                                  {entry.durationMs != null && <p><span className="text-gray-500">Duration:</span> <span className="text-green-400">{entry.durationMs}ms</span></p>}
                                  <p><span className="text-gray-500">Seq:</span> {entry.seq}</p>
                                </div>
                                {Object.keys(extra).length > 0 && (
                                  <div className="rounded-lg bg-gray-900 p-3 text-gray-200">
                                    <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono">{JSON.stringify(extra, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                              {msg && (
                                <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
                                  <p className="text-xs font-medium text-gray-400">完整消息</p>
                                  <p className="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-gray-200">{msg}</p>
                                </div>
                              )}
                              {entry.error && typeof entry.error === "object" && (
                                <div className="mt-3 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3">
                                  <p className="text-xs font-medium text-amber-400">错误</p>
                                  <p className="mt-1 font-mono text-xs text-amber-300">[{entry.error.code}] {entry.error.detail}</p>
                                </div>
                              )}
                              {typeof entry.exception === "string" && entry.exception && (
                                <div className="mt-3 rounded-lg border border-red-800/50 bg-red-950/30 p-3">
                                  <p className="text-xs font-medium text-red-400">异常堆栈</p>
                                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-red-300">{entry.exception}</pre>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            showPageInfo
          />
        </div>
      </Card>
    </div>
  );
}
