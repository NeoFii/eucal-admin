import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminUserInfo } from "@/types";

interface AuthState {
  user: AdminUserInfo | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUserInfo) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user) => {
        // Token 通过 HttpOnly Cookie 存储，store 仅保存用户信息
        set({ user, isAuthenticated: true });
      },
      clearAuth: () => {
        set({ user: null, isAuthenticated: false });
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
