import { apiClient, type ApiResponse } from "./client";
import type {
  PaginatedResponse,
  UserListItem,
  UserDetailData,
  UserApiKeyItem,
  UserTransactionItem,
  UserUsageLogItem,
  UserUsageStatItem,
  UsageAnalyticsData,
  UsageAnalyticsRange,
  UpdateUserStatusRequest,
  ResetUserPasswordRequest,
  TopupUserRequest,
  AdjustUserBalanceRequest,
  UpdateUserRpmRequest,
} from "@/types";

const BASE = "/api/v1/users";

export const userManagementApi = {
  getList: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: number;
  }): Promise<PaginatedResponse<UserListItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<UserListItem>>>(BASE, { params });
    return response.data.data;
  },

  getDetail: async (uid: string): Promise<UserDetailData> => {
    const response = await apiClient.get<ApiResponse<UserDetailData>>(`${BASE}/${uid}`);
    return response.data.data;
  },

  updateStatus: async (uid: string, data: UpdateUserStatusRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/status`, data);
  },

  resetPassword: async (uid: string, data: ResetUserPasswordRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/reset-password`, data);
  },

  topup: async (uid: string, data: TopupUserRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/topup`, data);
  },

  adjustBalance: async (uid: string, data: AdjustUserBalanceRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/adjust-balance`, data);
  },

  updateRpm: async (uid: string, data: UpdateUserRpmRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/rpm`, data);
  },

  getTransactions: async (uid: string, params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<UserTransactionItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<UserTransactionItem>>>(`${BASE}/${uid}/transactions`, { params });
    return response.data.data;
  },

  getApiKeys: async (uid: string): Promise<UserApiKeyItem[]> => {
    const response = await apiClient.get<ApiResponse<UserApiKeyItem[]>>(`${BASE}/${uid}/api-keys`);
    return response.data.data;
  },

  disableApiKey: async (uid: string, keyId: number): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/api-keys/${keyId}/disable`);
  },

  enableApiKey: async (uid: string, keyId: number): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/api-keys/${keyId}/enable`);
  },

  getUsageLogs: async (params?: {
    page?: number;
    page_size?: number;
    user_id?: number;
    model_name?: string;
    request_id?: string;
    start?: string;
    end?: string;
  }): Promise<PaginatedResponse<UserUsageLogItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<UserUsageLogItem>>>(`${BASE}/usage/logs`, { params });
    return response.data.data;
  },

  getUsageStats: async (params?: {
    user_id?: number;
    model_name?: string;
    start?: string;
    end?: string;
  }): Promise<UserUsageStatItem[]> => {
    const response = await apiClient.get<ApiResponse<UserUsageStatItem[]>>(`${BASE}/usage/stats`, { params });
    return response.data.data;
  },

  getUserUsageStats: async (uid: string, params?: {
    start?: string;
    end?: string;
  }): Promise<UserUsageStatItem[]> => {
    const response = await apiClient.get<ApiResponse<UserUsageStatItem[]>>(`${BASE}/${uid}/usage/stats`, { params });
    return response.data.data;
  },

  getUserUsageAnalytics: async (uid: string, range: UsageAnalyticsRange = "24h"): Promise<UsageAnalyticsData> => {
    const response = await apiClient.get<ApiResponse<UsageAnalyticsData>>(`${BASE}/${uid}/usage/analytics`, { params: { range } });
    return response.data.data;
  },
};
