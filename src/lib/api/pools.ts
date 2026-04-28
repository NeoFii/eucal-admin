import { apiClient, type ApiResponse } from "./client";
import type {
  PaginatedResponse,
  PoolItem,
  PoolDetail,
  PoolCreate,
  PoolUpdate,
  PoolModelItem,
  PoolModelCreate,
  PoolModelUpdate,
  PoolAccountItem,
  PoolAccountCreate,
  PoolAccountUpdate,
  SyncModelsResult,
  CheckBalancesResult,
} from "@/types";

const BASE = "/api/v1/admin/pools";

export const poolsApi = {
  getList: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<PoolItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<PoolItem>>>(BASE, { params });
    return response.data.data;
  },

  getDetail: async (slug: string): Promise<PoolDetail> => {
    const response = await apiClient.get<ApiResponse<PoolDetail>>(`${BASE}/${slug}`);
    return response.data.data;
  },

  create: async (data: PoolCreate): Promise<PoolItem> => {
    const response = await apiClient.post<ApiResponse<PoolItem>>(BASE, data);
    return response.data.data;
  },

  update: async (slug: string, data: PoolUpdate): Promise<PoolItem> => {
    const response = await apiClient.patch<ApiResponse<PoolItem>>(`${BASE}/${slug}`, data);
    return response.data.data;
  },

  disable: async (slug: string): Promise<PoolItem> => {
    const response = await apiClient.delete<ApiResponse<PoolItem>>(`${BASE}/${slug}`);
    return response.data.data;
  },

  addModel: async (slug: string, data: PoolModelCreate): Promise<PoolModelItem> => {
    const response = await apiClient.post<ApiResponse<PoolModelItem>>(`${BASE}/${slug}/models`, data);
    return response.data.data;
  },

  updateModel: async (slug: string, modelSlug: string, data: PoolModelUpdate): Promise<PoolModelItem> => {
    const response = await apiClient.patch<ApiResponse<PoolModelItem>>(`${BASE}/${slug}/models/${modelSlug}`, data);
    return response.data.data;
  },

  removeModel: async (slug: string, modelSlug: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${slug}/models/${modelSlug}`);
  },

  addAccount: async (slug: string, data: PoolAccountCreate): Promise<PoolAccountItem> => {
    const response = await apiClient.post<ApiResponse<PoolAccountItem>>(`${BASE}/${slug}/accounts`, data);
    return response.data.data;
  },

  updateAccount: async (slug: string, accountId: number, data: PoolAccountUpdate): Promise<PoolAccountItem> => {
    const response = await apiClient.patch<ApiResponse<PoolAccountItem>>(`${BASE}/${slug}/accounts/${accountId}`, data);
    return response.data.data;
  },

  disableAccount: async (slug: string, accountId: number): Promise<PoolAccountItem> => {
    const response = await apiClient.delete<ApiResponse<PoolAccountItem>>(`${BASE}/${slug}/accounts/${accountId}`);
    return response.data.data;
  },

  syncModels: async (slug: string): Promise<SyncModelsResult> => {
    const response = await apiClient.post<ApiResponse<SyncModelsResult>>(`${BASE}/${slug}/models/sync`);
    return response.data.data;
  },

  checkBalances: async (slug: string): Promise<CheckBalancesResult> => {
    const response = await apiClient.post<ApiResponse<CheckBalancesResult>>(`${BASE}/${slug}/accounts/check`);
    return response.data.data;
  },
};
