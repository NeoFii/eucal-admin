import { apiClient, type ApiResponse } from "./client";
import type { RoutingSettingItem, RoutingSettingBatchItem } from "@/types";

const BASE = "/api/v1/admin/routing-settings";

export const routingSettingsApi = {
  getAll: async (): Promise<Record<string, RoutingSettingItem[]>> => {
    const response = await apiClient.get<ApiResponse<Record<string, RoutingSettingItem[]>>>(BASE);
    return response.data.data;
  },

  updateSingle: async (key: string, value: string): Promise<RoutingSettingItem> => {
    const response = await apiClient.put<ApiResponse<RoutingSettingItem>>(`${BASE}/${key}`, { value });
    return response.data.data;
  },

  batchUpdate: async (items: RoutingSettingBatchItem[]): Promise<Record<string, RoutingSettingItem[]>> => {
    const response = await apiClient.put<ApiResponse<Record<string, RoutingSettingItem[]>>>(`${BASE}/batch`, { items });
    return response.data.data;
  },
};
