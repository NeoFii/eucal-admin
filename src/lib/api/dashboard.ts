import { apiClient, type ApiResponse } from "./client";
import type {
  DashboardSummary,
  UserGrowthPoint,
  UsageTrendsData,
} from "@/types";

const BASE = "/api/v1/dashboard";

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<ApiResponse<DashboardSummary>>(`${BASE}/summary`);
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
};
