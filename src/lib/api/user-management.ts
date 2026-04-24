import { apiClient, type ApiResponse } from "./client";
import type {
  PaginatedResponse,
  UserListItem,
  UserDetailData,
  UserApiKeyItem,
  UserTransactionItem,
  UserUsageLogItem,
  UserUsageStatItem,
  UpdateUserStatusRequest,
  ResetUserPasswordRequest,
  TopupUserRequest,
  AdjustUserBalanceRequest,
} from "@/types";

const BASE = "/api/v1/admin/users";

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

  getDetail: async (uid: number): Promise<UserDetailData> => {
    const response = await apiClient.get<ApiResponse<UserDetailData>>(`${BASE}/${uid}`);
    return response.data.data;
  },

  updateStatus: async (uid: number, data: UpdateUserStatusRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/status`, data);
  },

  resetPassword: async (uid: number, data: ResetUserPasswordRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/reset-password`, data);
  },

  topup: async (uid: number, data: TopupUserRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/topup`, data);
  },

  adjustBalance: async (uid: number, data: AdjustUserBalanceRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/adjust-balance`, data);
  },

  getTransactions: async (uid: number, params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<UserTransactionItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<UserTransactionItem>>>(`${BASE}/${uid}/transactions`, { params });
    return response.data.data;
  },

  getApiKeys: async (uid: number): Promise<UserApiKeyItem[]> => {
    const response = await apiClient.get<ApiResponse<UserApiKeyItem[]>>(`${BASE}/${uid}/api-keys`);
    return response.data.data;
  },

  disableApiKey: async (uid: number, keyId: number): Promise<void> => {
    await apiClient.post(`${BASE}/${uid}/api-keys/${keyId}/disable`);
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
};
