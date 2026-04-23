import { apiClient, type ApiResponse } from "./client";

// 邀请码类型
export interface InvitationCode {
  id: number;
  code: string;
  status: number;
  created_by: number | null;
  used_by: number | null;
  used_at: string | null;
  expires_at: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

// 邀请码列表查询参数
export interface InvitationCodeParams {
  page?: number;
  page_size?: number;
  status?: number;
}

// 邀请码列表响应
export interface InvitationCodeListResponse {
  items: InvitationCode[];
  total: number;
  page: number;
  page_size: number;
}

export interface GenerateInvitationCodeResponse {
  codes: InvitationCode[];
}

// 生成邀请码请求
export interface GenerateInvitationCodeRequest {
  quantity?: number;
  expires_days?: number;      // 过期天数（与 expires_at 二选一）
  expires_at?: string;        // 具体过期时间（与 expires_days 二选一，优先使用）
  max_uses?: number;
  remark?: string;
}

// 更新邀请码请求
export interface UpdateInvitationCodeRequest {
  expires_at?: string;
  remark?: string;
}

// 邀请码 API
export const invitationCodeApi = {
  // 获取邀请码列表
  getList: async (params?: InvitationCodeParams): Promise<InvitationCodeListResponse> => {
    const response = await apiClient.get<ApiResponse<InvitationCodeListResponse>>("/api/v1/invitation-codes", { params });
    return response.data.data;
  },

  // 生成邀请码
  generate: async (data: GenerateInvitationCodeRequest): Promise<InvitationCode[]> => {
    const response = await apiClient.post<ApiResponse<GenerateInvitationCodeResponse>>(
      "/api/v1/invitation-codes/generate",
      data
    );
    return response.data.data.codes;
  },

  // 更新邀请码
  update: async (id: number, data: UpdateInvitationCodeRequest): Promise<void> => {
    await apiClient.patch(`/api/v1/invitation-codes/${id}`, data);
  },

  // 启用邀请码
  enable: async (id: number): Promise<void> => {
    await apiClient.patch(`/api/v1/invitation-codes/${id}/enable`);
  },

  // 弃用邀请码
  disable: async (id: number): Promise<void> => {
    await apiClient.patch(`/api/v1/invitation-codes/${id}/disable`);
  },
};
