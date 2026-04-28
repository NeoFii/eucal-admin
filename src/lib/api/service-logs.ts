import { apiClient, type ApiResponse } from "./client";

export interface ServiceLogsParams {
  service?: string;
  level?: string;
  since?: string;
  until?: string;
  search?: string;
  after_seq?: number;
  page?: number;
  page_size?: number;
}

export interface ServiceLogEntry {
  seq: number;
  timestamp: string;
  service: string;
  level: string;
  logger: string;
  event: string;
  message?: string;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  uid?: string;
  env?: string;
  durationMs?: number;
  error?: { code: string; detail: string };
  exception?: string;
  [key: string]: unknown;
}

export interface ServiceLogResult {
  service: string;
  reachable: boolean;
  entries: ServiceLogEntry[];
  total: number;
  latest_seq: number;
  error?: string;
}

export interface ServiceLogsResponseData {
  results: ServiceLogResult[];
  items: ServiceLogEntry[];
  total: number;
  page: number;
  page_size: number;
}

export const serviceLogsApi = {
  getLogs: async (params?: ServiceLogsParams): Promise<ServiceLogsResponseData> => {
    const response = await apiClient.get<ApiResponse<ServiceLogsResponseData>>(
      "/api/v1/admin/service-logs",
      { params },
    );
    return response.data.data;
  },
};
