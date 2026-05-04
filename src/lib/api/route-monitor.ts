import { apiClient, type ApiResponse } from "./client";
import type {
  RouteAggregateData,
  RouteCompareData,
  RouteMonitorListData,
  RouteRequestDetail,
  RouteRequestListParams,
  RouteAggregateParams,
} from "@/types";

export const routeMonitorApi = {
  list: async (params?: RouteRequestListParams): Promise<RouteMonitorListData> => {
    const response = await apiClient.get<ApiResponse<RouteMonitorListData>>(
      "/api/v1/admin/route-monitor/requests",
      { params },
    );
    return response.data.data;
  },

  detail: async (requestId: string): Promise<RouteRequestDetail> => {
    const response = await apiClient.get<ApiResponse<RouteRequestDetail>>(
      `/api/v1/admin/route-monitor/requests/${encodeURIComponent(requestId)}`,
    );
    return response.data.data;
  },

  aggregates: async (params?: RouteAggregateParams): Promise<RouteAggregateData> => {
    const response = await apiClient.get<ApiResponse<RouteAggregateData>>(
      "/api/v1/admin/route-monitor/aggregates",
      { params },
    );
    return response.data.data;
  },

  compare: async (requestId: string, limit = 20): Promise<RouteCompareData> => {
    const response = await apiClient.get<ApiResponse<RouteCompareData>>(
      `/api/v1/admin/route-monitor/compare/${encodeURIComponent(requestId)}`,
      { params: { limit } },
    );
    return response.data.data;
  },
};
