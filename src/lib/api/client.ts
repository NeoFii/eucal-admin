import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:8001";

// 后端统一响应格式
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      // 清除 Zustand 认证状态
      useAuthStore.getState().clearAuth();
      // 跳转到登录页
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
