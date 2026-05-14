import { apiClient, type ApiResponse } from "./client";
import type {
  DashboardSummary,
  UserGrowthPoint,
  UsageTrendsData,
  RpmTrendData,
  TpmTrendData,
} from "@/types";

const BASE = "/api/v1/dashboard";

export const dashboardApi = {
  getSummary: async (params?: { start: string; end: string }): Promise<DashboardSummary> => {
    const response = await apiClient.get<ApiResponse<DashboardSummary>>(`${BASE}/summary`, { params });
    return response.data.data;
  },

  getUserGrowth: async (params: {
    start: string;
    end: string;
  }): Promise<UserGrowthPoint[]> => {
    const response = await apiClient.get<ApiResponse<UserGrowthPoint[]>>(`${BASE}/user-growth`, { params });
    return response.data.data;
  },

  getUsageTrends: async (params: {
    start: string;
    end: string;
  }): Promise<UsageTrendsData> => {
    const response = await apiClient.get<ApiResponse<UsageTrendsData>>(`${BASE}/usage-trends`, { params });
    return response.data.data;
  },

  getRpmTrend: async (params: {
    start: string;
    end: string;
    bucket_seconds: number;
  }): Promise<RpmTrendData> => {
    const response = await apiClient.get<ApiResponse<RpmTrendData>>(`${BASE}/rpm-trend`, { params });
    return response.data.data;
  },

  getTpmTrend: async (params: {
    start: string;
    end: string;
    bucket_seconds: number;
  }): Promise<TpmTrendData> => {
    const response = await apiClient.get<ApiResponse<TpmTrendData>>(`${BASE}/tpm-trend`, { params });
    return response.data.data;
  },
};
