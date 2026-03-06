import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminUserInfo } from "@/types";

interface AuthState {
  user: AdminUserInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUserInfo, accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        // Token 现在通过 HttpOnly Cookie 存储，不需要存入 localStorage
        set({ user, accessToken, isAuthenticated: true });
      },
      clearAuth: () => {
        // 登出时清除状态，Cookie 由后端处理删除
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: "admin-auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
