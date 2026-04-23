"use client";

import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let globalAddToast: ((toast: Omit<ToastData, "id">) => void) | null = null;

// 全局 toast 调用入口
export const toast = {
  success: (title: string, description?: string) =>
    globalAddToast?.({ title, description, variant: "success" }),
  error: (title: string, description?: string) =>
    globalAddToast?.({ title, description, variant: "destructive" }),
  info: (title: string, description?: string) =>
    globalAddToast?.({ title, description, variant: "default" }),
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((data: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...data, id }]);
    // 3秒后自动移除
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 注册全局入口
  globalAddToast = addToast;

  return { toasts, addToast, removeToast };
}
