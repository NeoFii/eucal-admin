// 管理员认证相关类型

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export type AdminRole = "super_admin" | "admin";

export interface AdminUserInfo {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  status: number;
}

export interface AdminListItem {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  status: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminListResponseData {
  items: AdminListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateAdminRequest {
  email: string;
  name: string;
  password: string;
}

export interface CreateAdminResponseData {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateAdminStatusRequest {
  status: 0 | 1;
}

export interface ResetAdminPasswordRequest {
  new_password: string;
}

export type AdminAuditCategory = "all" | "governance" | "auth";

export interface AdminAuditActor {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminAuditLogItem {
  id: number;
  actor_admin: AdminAuditActor;
  target_admin: AdminAuditActor | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  status: "success" | "failed";
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminAuditLogListData {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  total_users: number;
  total_invitation_codes: number;
  used_invitation_codes: number;
  valid_invitation_codes: number;
}
