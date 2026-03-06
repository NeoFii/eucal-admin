// 管理员认证相关类型

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AdminUserInfo {
  uid: number;
  email: string;
  name: string;
  role: string;
  status: number;
}

export interface DashboardStats {
  total_users: number;
  total_invitation_codes: number;
  used_invitation_codes: number;
  valid_invitation_codes: number;
}
