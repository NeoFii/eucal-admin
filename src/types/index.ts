// ── 管理员认证 ──────────────────────────────────────────────

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
  last_login_at: string | null;
  created_at: string;
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

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// ── 审计日志 ──────────────────────────────────────────────

export type AdminAuditCategory =
  | "all"
  | "governance"
  | "auth"
  | "user_management"
  | "model_catalog"
  | "routing_config";

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

// ── 通用分页 ──────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ── 模型目录 ──────────────────────────────────────────────

export interface ModelVendorBrief {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
}

export interface ModelVendorItem {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ModelVendorCreate {
  slug: string;
  name: string;
  logo_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface ModelVendorUpdate {
  name?: string;
  logo_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface ModelCategoryBrief {
  key: string;
  name: string;
  sort_order: number;
}

export interface ModelCategoryItem {
  id: number;
  key: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ModelCategoryCreate {
  key: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ModelCategoryUpdate {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface SupportedModelItem {
  id: number;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  price_input_per_m_fen: number | null;
  price_output_per_m_fen: number | null;
  capability_tags: string[];
  context_window: number | null;
  max_output_tokens: number | null;
  is_reasoning_model: boolean;
  sort_order: number;
  vendor: ModelVendorBrief;
  categories: ModelCategoryBrief[];
}

export interface SupportedModelDetail extends SupportedModelItem {
  is_active: boolean;
}

export interface SupportedModelCreate {
  slug: string;
  name: string;
  vendor_slug: string;
  summary?: string | null;
  description?: string | null;
  price_input_per_m_fen?: number | null;
  price_output_per_m_fen?: number | null;
  capability_tags?: string[];
  context_window?: number | null;
  max_output_tokens?: number | null;
  is_reasoning_model?: boolean;
  is_active?: boolean;
  sort_order?: number;
  category_keys?: string[];
}

export interface SupportedModelUpdate {
  name?: string;
  vendor_slug?: string;
  summary?: string | null;
  description?: string | null;
  price_input_per_m_fen?: number | null;
  price_output_per_m_fen?: number | null;
  capability_tags?: string[];
  context_window?: number | null;
  max_output_tokens?: number | null;
  is_reasoning_model?: boolean;
  is_active?: boolean;
  sort_order?: number;
  category_keys?: string[];
}

// ── 兑换码 ──────────────────────────────────────────────

export interface VoucherCode {
  id: number;
  code_prefix: string;
  code_suffix: string;
  amount: number;
  status: number;
  starts_at: string;
  expires_at: string;
  redeemed_user_id: number | null;
  redeemed_at: string | null;
  created_by_admin_uid: number | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatedVoucherCode extends VoucherCode {
  code: string;
}

export interface GenerateVoucherRequest {
  amount: number;
  count: number;
  starts_at: string;
  expires_at: string;
  remark?: string;
}

// ── 用户管理 ──────────────────────────────────────────────

export interface UserListItem {
  uid: string;
  email: string;
  status: number;
  email_verified_at: string | null;
  last_login_at: string | null;
  balance: number;
  created_at: string;
}

export interface UserDetailData {
  uid: string;
  email: string;
  status: number;
  email_verified_at: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  balance: number;
  frozen_amount: number;
  used_amount: number;
  total_requests: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface UserApiKeyItem {
  id: number;
  key_prefix: string;
  name: string;
  status: number;
  quota_mode: number;
  quota_limit: number;
  quota_used: number;
  allowed_models: string | null;
  allow_ips: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface UserTransactionItem {
  id: number;
  type: number;
  amount: number;
  balance_before: number;
  balance_after: number;
  ref_type: string | null;
  ref_id: string | null;
  remark: string | null;
  operator_id: number | null;
  created_at: string;
}

export interface UserUsageLogItem {
  id: number;
  user_id: number;
  request_id: string;
  api_key_id: number | null;
  model_name: string;
  selected_model: string | null;
  provider_slug: string | null;
  upstream_model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  total_tokens: number;
  cost: number;
  status: number;
  duration_ms: number | null;
  is_stream: boolean;
  config_version: number | null;
  routing_tier: number | null;
  error_code: string | null;
  error_msg: string | null;
  ip: string | null;
  created_at: string;
}

export interface UserUsageStatItem {
  id: number;
  user_id: number;
  api_key_id: number | null;
  model_name: string;
  stat_hour: string;
  request_count: number;
  success_count: number;
  error_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  total_tokens: number;
  total_cost: number;
}

export interface UpdateUserStatusRequest {
  status: 0 | 1;
}

export interface ResetUserPasswordRequest {
  new_password: string;
}

export interface TopupUserRequest {
  amount: number;
  remark?: string;
}

export interface AdjustUserBalanceRequest {
  amount: number;
  remark: string;
}

// ── 路由配置 ──────────────────────────────────────────────

export interface CredentialItem {
  id: number;
  slug: string;
  provider_slug: string;
  mask: string;
  is_active: boolean;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialCreate {
  slug: string;
  provider_slug: string;
  api_key: string;
  remark?: string;
}

export interface CredentialUpdate {
  provider_slug?: string;
  api_key?: string;
  remark?: string;
  is_active?: boolean;
}

export interface ModelProviderBinding {
  credential_slug: string;
  api_base: string;
  upstream_model: string;
}

export interface RoutingConfigData {
  router_alias: string;
  weights: Record<string, number>;
  score_bands: string;
  tier_model_map: Record<string, string>;
  model_provider_bindings: Record<string, ModelProviderBinding>;
}

export interface RoutingConfigCreate {
  description?: string;
  config_data: RoutingConfigData;
}

export interface RoutingConfigUpdate {
  description?: string;
  config_data?: RoutingConfigData;
}

export interface RoutingConfigItem {
  id: number;
  version: number;
  status: string;
  description: string | null;
  config_data: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutingConfigBrief {
  id: number;
  version: number;
  status: string;
  description: string | null;
  published_at: string | null;
  created_at: string;
}
