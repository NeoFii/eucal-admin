import { apiClient, type ApiResponse } from "./client";
import type {
  PaginatedResponse,
  VoucherCode,
  CreatedVoucherCode,
  GenerateVoucherRequest,
} from "@/types";

const BASE = "/api/v1/vouchers";

export const voucherApi = {
  generate: async (data: GenerateVoucherRequest): Promise<CreatedVoucherCode[]> => {
    const response = await apiClient.post<ApiResponse<{ items: CreatedVoucherCode[] }>>(BASE, data);
    return response.data.data.items;
  },

  getList: async (params?: { page?: number; page_size?: number; status?: number }): Promise<PaginatedResponse<VoucherCode>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<VoucherCode>>>(BASE, { params });
    return response.data.data;
  },

  getDetail: async (codeId: number): Promise<VoucherCode> => {
    const response = await apiClient.get<ApiResponse<VoucherCode>>(`${BASE}/${codeId}`);
    return response.data.data;
  },

  remove: async (codeId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${codeId}`);
  },
};
