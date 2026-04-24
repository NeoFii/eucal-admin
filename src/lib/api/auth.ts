import { apiClient, type ApiResponse } from "./client";
import type { AdminLoginRequest, AdminUserInfo, ChangePasswordRequest } from "@/types";

// 登录响应数据
interface LoginData {
  user: {
    uid: string;
    email: string;
    name: string;
    role: string;
  };
  access_token: string;
  expires_in: number;
}

// 认证 API
export const authApi = {
  // 登录
  login: async (data: AdminLoginRequest): Promise<LoginData> => {
    const response = await apiClient.post<ApiResponse<LoginData>>("/api/v1/auth/login", data);
    return {
      ...response.data.data,
      user: {
        ...response.data.data.user,
        uid: String(response.data.data.user.uid),
      },
    };
  },

  // 登出
  logout: async (): Promise<void> => {
    await apiClient.post("/api/v1/auth/logout");
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<AdminUserInfo> => {
    const response = await apiClient.get<ApiResponse<AdminUserInfo>>("/api/v1/auth/me");
    return {
      ...response.data.data,
      uid: String(response.data.data.uid),
    };
  },

  // 刷新 Token
  refreshToken: async (): Promise<{ access_token: string; expires_in: number }> => {
    const response = await apiClient.post<ApiResponse<{ access_token: string; expires_in: number }>>("/api/v1/auth/refresh");
    return response.data.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post("/api/v1/auth/change-password", data);
  },
};
