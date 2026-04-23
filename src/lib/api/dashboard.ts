import { apiClient, type ApiResponse } from "./client";
import type { DashboardStats } from "@/types";

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>("/api/v1/dashboard/stats");
    return response.data.data;
  },
};
