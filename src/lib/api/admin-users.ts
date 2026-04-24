import { apiClient, type ApiResponse } from "./client";
import type {
  AdminListResponseData,
  CreateAdminRequest,
  CreateAdminResponseData,
  ResetAdminPasswordRequest,
  UpdateAdminStatusRequest,
} from "@/types";

export interface AdminUsersParams {
  page?: number;
  page_size?: number;
}

const normalizeAdminUser = <T extends { uid: string | number }>(admin: T): T => ({
  ...admin,
  uid: String(admin.uid),
});

export const adminUsersApi = {
  list: async (params?: AdminUsersParams): Promise<AdminListResponseData> => {
    const response = await apiClient.get<ApiResponse<AdminListResponseData>>("/api/v1/admin/admin-users", {
      params,
    });
    return {
      ...response.data.data,
      items: response.data.data.items.map(normalizeAdminUser),
    };
  },

  create: async (payload: CreateAdminRequest): Promise<CreateAdminResponseData> => {
    const response = await apiClient.post<ApiResponse<CreateAdminResponseData>>("/api/v1/admin/admin-users", payload);
    return normalizeAdminUser(response.data.data);
  },

  updateStatus: async (uid: string, payload: UpdateAdminStatusRequest): Promise<void> => {
    await apiClient.patch(`/api/v1/admin/admin-users/${uid}/status`, payload);
  },

  resetPassword: async (uid: string, payload: ResetAdminPasswordRequest): Promise<void> => {
    await apiClient.post(`/api/v1/admin/admin-users/${uid}/reset-password`, payload);
  },
};
