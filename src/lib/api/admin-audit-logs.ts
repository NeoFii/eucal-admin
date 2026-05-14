import { apiClient, type ApiResponse } from "./client";
import { mapRoleFromApi } from "./role-mapping";
import type { AdminAuditCategory, AdminAuditLogListData } from "@/types";

export interface AdminAuditLogsParams {
  page?: number;
  page_size?: number;
  category?: AdminAuditCategory;
  action?: string;
  actor_uid?: string;
  target_uid?: string;
}

const normalizeAuditActor = <T extends { uid: string | number; role: number | string }>(actor: T): T => ({
  ...actor,
  uid: String(actor.uid),
  role: mapRoleFromApi(actor.role as number) as T["role"],
});

const normalizeAuditLog = <T extends {
  actor_admin: { uid: string | number; role: number | string };
  target_admin: { uid: string | number; role: number | string } | null;
}>(log: T): T => ({
  ...log,
  actor_admin: normalizeAuditActor(log.actor_admin),
  target_admin: log.target_admin ? normalizeAuditActor(log.target_admin) : null,
});

export const adminAuditLogsApi = {
  list: async (params?: AdminAuditLogsParams): Promise<AdminAuditLogListData> => {
    const response = await apiClient.get<ApiResponse<AdminAuditLogListData>>("/api/v1/admin-audit-logs", {
      params,
    });
    return {
      ...response.data.data,
      items: response.data.data.items.map(normalizeAuditLog),
    };
  },
};
