import { apiClient, type ApiResponse } from "./client";
import type {
  PaginatedResponse,
  CredentialItem,
  CredentialCreate,
  CredentialUpdate,
  RoutingConfigItem,
  RoutingConfigBrief,
  RoutingConfigCreate,
  RoutingConfigUpdate,
} from "@/types";

const BASE = "/api/v1/admin/routing-config";

export const routingConfigApi = {
  createCredential: async (data: CredentialCreate): Promise<CredentialItem> => {
    const response = await apiClient.post<ApiResponse<CredentialItem>>(`${BASE}/credentials`, data);
    return response.data.data;
  },

  getCredentials: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<CredentialItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<CredentialItem>>>(`${BASE}/credentials`, { params });
    return response.data.data;
  },

  updateCredential: async (slug: string, data: CredentialUpdate): Promise<CredentialItem> => {
    const response = await apiClient.patch<ApiResponse<CredentialItem>>(`${BASE}/credentials/${slug}`, data);
    return response.data.data;
  },

  deleteCredential: async (slug: string, force?: boolean): Promise<void> => {
    await apiClient.delete(`${BASE}/credentials/${slug}`, { params: force ? { force: true } : undefined });
  },

  createVersion: async (data: RoutingConfigCreate): Promise<RoutingConfigItem> => {
    const response = await apiClient.post<ApiResponse<RoutingConfigItem>>(`${BASE}/versions`, data);
    return response.data.data;
  },

  getVersions: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<RoutingConfigBrief>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<RoutingConfigBrief>>>(`${BASE}/versions`, { params });
    return response.data.data;
  },

  getActiveVersion: async (): Promise<RoutingConfigItem> => {
    const response = await apiClient.get<ApiResponse<RoutingConfigItem>>(`${BASE}/versions/active`);
    return response.data.data;
  },

  getVersion: async (version: number): Promise<RoutingConfigItem> => {
    const response = await apiClient.get<ApiResponse<RoutingConfigItem>>(`${BASE}/versions/${version}`);
    return response.data.data;
  },

  updateVersion: async (version: number, data: RoutingConfigUpdate): Promise<RoutingConfigItem> => {
    const response = await apiClient.put<ApiResponse<RoutingConfigItem>>(`${BASE}/versions/${version}`, data);
    return response.data.data;
  },

  publishVersion: async (version: number): Promise<RoutingConfigItem> => {
    const response = await apiClient.post<ApiResponse<RoutingConfigItem>>(`${BASE}/versions/${version}/publish`);
    return response.data.data;
  },

  rollbackVersion: async (version: number): Promise<RoutingConfigItem> => {
    const response = await apiClient.post<ApiResponse<RoutingConfigItem>>(`${BASE}/versions/${version}/rollback`);
    return response.data.data;
  },
};
