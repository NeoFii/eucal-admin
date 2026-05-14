import { apiClient, type ApiResponse } from "./client";
import { mapRoleFromApi, mapRoleToApi } from "./role-mapping";
import type {
  AdminListResponseData,
  CreateAdminRequest,
  CreateAdminResponseData,
  ResetAdminPasswordRequest,
  UpdateAdminRoleRequest,
  UpdateAdminStatusRequest,
} from "@/types";

export interface AdminUsersParams {
  page?: number;
  page_size?: number;
}

const normalizeAdminUser = <T extends { uid: string | number; role: number | string }>(admin: T): T => ({
  ...admin,
  uid: String(admin.uid),
  role: mapRoleFromApi(admin.role as number) as T["role"],
});

export const adminUsersApi = {
  list: async (params?: AdminUsersParams): Promise<AdminListResponseData> => {
    const response = await apiClient.get<ApiResponse<AdminListResponseData>>("/api/v1/admin-users", {
      params,
    });
    return {
      ...response.data.data,
      items: response.data.data.items.map(normalizeAdminUser),
    };
  },

  create: async (payload: CreateAdminRequest): Promise<CreateAdminResponseData> => {
    const response = await apiClient.post<ApiResponse<CreateAdminResponseData>>(
      "/api/v1/admin-users",
      { ...payload, role: payload.role ? mapRoleToApi(payload.role) : undefined },
    );
    return normalizeAdminUser(response.data.data);
  },

  updateStatus: async (uid: string, payload: UpdateAdminStatusRequest): Promise<void> => {
    await apiClient.patch(`/api/v1/admin-users/${uid}/status`, payload);
  },

  resetPassword: async (uid: string, payload: ResetAdminPasswordRequest): Promise<void> => {
    await apiClient.post(`/api/v1/admin-users/${uid}/reset-password`, payload);
  },

  updateRole: async (uid: string, payload: UpdateAdminRoleRequest): Promise<void> => {
    await apiClient.patch(`/api/v1/admin-users/${uid}/role`, {
      role: mapRoleToApi(payload.role),
    });
  },
};
