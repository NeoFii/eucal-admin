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
  is_root: boolean;
  status: number;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminListItem {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  is_root: boolean;
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
  role?: AdminRole;
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

export interface UpdateAdminRoleRequest {
  role: AdminRole;
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
  routing_slug: string | null;
  name: string;
  summary: string | null;
  description: string | null;
  price_input_per_m_fen: number | null;
  price_output_per_m_fen: number | null;
  price_cached_input_per_m_fen: number | null;
  capability_tags: string[];
  context_window: number | null;
  max_output_tokens: number | null;
  is_reasoning_model: boolean;
  is_active: boolean;
  sort_order: number;
  vendor: ModelVendorBrief;
  categories: ModelCategoryBrief[];
}

export type SupportedModelDetail = SupportedModelItem;

export interface SupportedModelCreate {
  slug: string;
  routing_slug?: string | null;
  name: string;
  vendor_slug: string;
  summary?: string | null;
  description?: string | null;
  price_input_per_m_fen?: number | null;
  price_output_per_m_fen?: number | null;
  price_cached_input_per_m_fen?: number | null;
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
  routing_slug?: string | null;
  vendor_slug?: string;
  summary?: string | null;
  description?: string | null;
  price_input_per_m_fen?: number | null;
  price_output_per_m_fen?: number | null;
  price_cached_input_per_m_fen?: number | null;
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
  redeemed_user_uid: string | null;
  redeemed_at: string | null;
  created_by_admin_uid: string | null;
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

// ── 路由设置（key-value） ─────────────────────────────────

export interface RoutingSettingItem {
  key: string;
  value: string;
  value_type: string;
  group_name: string;
  label: string;
  description: string | null;
  sort_order: number;
  updated_at: string;
}

export interface RoutingSettingBatchItem {
  key: string;
  value: string;
}

// ── 号池管理 ────────────────────────────────────────────

export interface PoolModelItem {
  id: number;
  model_slug: string;
  upstream_model_id: string;
  input_price_per_million: number;
  output_price_per_million: number;
  cached_input_price_per_million: number | null;
  context_length: number | null;
  is_enabled: boolean;
}

export interface PoolAccountItem {
  id: number;
  name: string;
  mask: string;
  balance: number;
  status: string;
  rpm_limit: number | null;
  tpm_limit: number | null;
  weight: number;
  last_checked_at: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface PoolItem {
  id: number;
  slug: string;
  name: string;
  base_url: string;
  is_enabled: boolean;
  priority: number;
  weight: number;
  health_check_endpoint: string | null;
  remark: string | null;
  model_count: number;
  account_count: number;
  created_at: string;
  updated_at: string;
}

export interface PoolDetail {
  id: number;
  slug: string;
  name: string;
  base_url: string;
  is_enabled: boolean;
  priority: number;
  weight: number;
  health_check_endpoint: string | null;
  remark: string | null;
  models: PoolModelItem[];
  accounts: PoolAccountItem[];
  created_at: string;
  updated_at: string;
}

export interface PoolCreate {
  slug: string;
  name: string;
  base_url: string;
  priority?: number;
  weight?: number;
  health_check_endpoint?: string;
  remark?: string;
}

export interface PoolUpdate {
  name?: string;
  base_url?: string;
  is_enabled?: boolean;
  priority?: number;
  weight?: number;
  health_check_endpoint?: string;
  remark?: string;
}

export interface PoolModelCreate {
  model_slug: string;
  upstream_model_id: string;
  input_price_per_million?: number;
  output_price_per_million?: number;
  cached_input_price_per_million?: number;
  context_length?: number;
}

export interface PoolModelUpdate {
  upstream_model_id?: string;
  input_price_per_million?: number;
  output_price_per_million?: number;
  cached_input_price_per_million?: number;
  context_length?: number;
  is_enabled?: boolean;
}

export interface PoolAccountCreate {
  name: string;
  api_key: string;
  balance?: number;
  rpm_limit?: number;
  tpm_limit?: number;
  weight?: number;
  remark?: string;
}

export interface PoolAccountUpdate {
  name?: string;
  api_key?: string;
  balance?: number;
  status?: string;
  rpm_limit?: number;
  tpm_limit?: number;
  weight?: number;
  remark?: string;
}

// ── 号池自动化 ─────────────────────────────────────────

export interface SyncModelsResult {
  added: string[];
  updated: string[];
  existing: string[];
  total_upstream: number;
}

export interface AccountBalanceResult {
  account_id: number;
  name: string;
  balance: number;
  status: string;
  error: string | null;
}

export interface CheckBalancesResult {
  results: AccountBalanceResult[];
}

// ── 号池可用模型（用于 tier 选择） ─────────────────────────

export interface AvailableModelSlug {
  model_slug: string;
  pool_names: string[];
}

// ── 仪表盘 ──────────────────────────────────────────────

export interface DashboardSummary {
  total_users: number;
  new_users_today: number;
  total_requests: number;
  requests_today: number;
  total_revenue: number;
  revenue_today: number;
  total_provider_cost: number;
  provider_cost_today: number;
}

export interface UserGrowthPoint {
  date: string;
  new_users: number;
  cumulative: number;
}

export interface DailyUsageTrend {
  date: string;
  request_count: number;
  success_count: number;
  error_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_revenue: number;
  total_provider_cost: number;
}

export interface ModelCallStat {
  model: string;
  request_count: number;
  total_revenue: number;
  total_provider_cost: number;
}

export interface UsageTrendsData {
  daily: DailyUsageTrend[];
  by_model: ModelCallStat[];
}

// ── 用户用量分析 ──────────────────────────────────────────

export type UsageAnalyticsRange = "8h" | "24h" | "7d" | "30d";

export interface UsageAnalyticsOverview {
  total_requests: number;
  success_requests: number;
  success_rate: number;
  total_cost: number;
}

export interface UsageAnalyticsModel {
  effective_model: string;
  request_count: number;
  request_share: number;
  total_cost: number;
}

export interface UsageAnalyticsBucketCost {
  effective_model: string;
  total_cost: number;
}

export interface UsageAnalyticsBucket {
  bucket_start: string;
  label: string;
  costs: UsageAnalyticsBucketCost[];
}

export interface UsageAnalyticsData {
  range: UsageAnalyticsRange;
  granularity: string;
  start: string;
  end: string;
  currency: string;
  overview: UsageAnalyticsOverview;
  models: UsageAnalyticsModel[];
  buckets: UsageAnalyticsBucket[];
}
