import axios from "axios";
import { attachAuthRefreshInterceptor } from "./auth-interceptor";

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const TESTING_BASE_URL = process.env.NEXT_PUBLIC_TESTING_API_URL || "http://localhost:8002";
const TESTING_REQUEST_TIMEOUT_MS = 20000;

const testingClient = axios.create({
  baseURL: TESTING_BASE_URL,
  timeout: TESTING_REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

attachAuthRefreshInterceptor(testingClient);

export interface Category {
  id: number;
  key: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryCreate {
  key: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ModelVendorBrief {
  id: number;
  slug: string;
  name: string;
  logo_url?: string;
}

export interface ModelCategoryBrief {
  key: string;
  name: string;
  sort_order: number;
}

export interface ProviderBrief {
  id: number;
  slug: string;
  name: string;
  logo_url?: string;
}

export interface ModelListItem {
  id: number;
  slug: string;
  name: string;
  description?: string;
  capability_tags: string[];
  context_window?: number;
  max_output_tokens?: number;
  is_reasoning_model: boolean;
  sort_order: number;
  is_active?: boolean;
  vendor: ModelVendorBrief;
  categories: ModelCategoryBrief[];
  providers?: ProviderBrief[];
  provider_count?: number;
}

export interface OfferingMetricsResponse {
  probe_region?: string;
  avg_throughput_tps?: number;
  avg_ttft_ms?: number;
  avg_e2e_latency_ms?: number;
  sample_count: number;
  last_measured_at?: string;
}

export interface ModelOfferingResponse {
  id: number;
  provider: ProviderBrief;
  price_input_per_m?: number;
  price_output_per_m?: number;
  provider_model_id?: string;
  provider_model_name?: string;
  price_updated_at?: string;
  is_active: boolean;
  metrics?: OfferingMetricsResponse | null;
}

export interface ModelDetail extends ModelListItem {
  is_active: boolean;
  offerings: ModelOfferingResponse[];
}

export interface BenchmarkOfferingSummary {
  offering_id: number;
  provider_name: string;
  provider_slug: string;
  metrics?: OfferingMetricsResponse | null;
  latest_probe?: LatestProbeResult | null;
}

export interface LatestProbeResult {
  success: boolean;
  error_code?: string | null;
  measured_at?: string;
  probe_region?: string;
}

export interface BenchmarkModelSummary {
  model_slug: string;
  model_name: string;
  vendor_name: string;
  offerings: BenchmarkOfferingSummary[];
}

export interface BenchmarkStatsSummaryResponse {
  items: BenchmarkModelSummary[];
  total: number;
}

export interface BenchmarkJobAcceptedResponse {
  job_id: string;
  job_type: "full" | "single";
  status: string;
  accepted: boolean;
  queued_count: number;
}

export interface BenchmarkJobStatusResponse {
  job_id: string;
  job_type: "full" | "single";
  status: string;
  trigger_source: string;
  requested_by_admin_id?: number;
  scope_offering_id?: number;
  total_offerings: number;
  completed_offerings: number;
  succeeded_offerings: number;
  failed_offerings: number;
  queued_count: number;
  error_message?: string | null;
  queued_at?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminProbeAudit {
  id: number;
  job_id: string;
  offering_id?: number | null;
  model_id?: number | null;
  provider_id?: number | null;
  triggered_by_admin_id?: number | null;
  status: string;
  success: boolean;
  error_code?: string | null;
  ttft_ms?: number | null;
  e2e_latency_ms?: number | null;
  throughput_tps?: number | null;
  prompt_tokens?: number | null;
  output_tokens?: number | null;
  probe_region?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
}

export interface AdminProbeAuditListResponse {
  items: AdminProbeAudit[];
  total: number;
}

export interface TrendDataPoint {
  date: string;
  avg_throughput_tps?: number;
  avg_ttft_ms?: number;
  avg_e2e_latency_ms?: number;
  sample_count: number;
}

export interface ProviderTrendLine {
  provider_id: number;
  provider_name: string;
  provider_slug: string;
  provider_logo_url?: string;
  data_points: TrendDataPoint[];
  min_throughput?: number;
  max_throughput?: number;
  avg_throughput?: number;
  min_ttft?: number;
  max_ttft?: number;
  avg_ttft?: number;
}

export interface BenchmarkTrendResponse {
  model_slug: string;
  model_name: string;
  days: number;
  date_range: string;
  providers: ProviderTrendLine[];
}

export interface ModelCategoryAssign {
  category_id: number;
  sort_order: number;
}

export interface ModelCreate {
  vendor_id: number;
  slug: string;
  name: string;
  description?: string;
  capability_tags: string[];
  context_window?: number;
  max_output_tokens?: number;
  is_reasoning_model: boolean;
  sort_order: number;
  is_active: boolean;
  categories: ModelCategoryAssign[];
}

export interface ModelUpdate {
  name?: string;
  description?: string;
  capability_tags?: string[];
  context_window?: number;
  max_output_tokens?: number;
  is_reasoning_model?: boolean;
  sort_order?: number;
  is_active?: boolean;
  categories?: ModelCategoryAssign[];
}

export interface Vendor {
  id: number;
  slug: string;
  name: string;
  logo_url?: string;
  is_active: boolean;
}

export interface VendorCreate {
  slug: string;
  name: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface ProviderProbeConfig {
  probe_api_base_url?: string;
  has_probe_api_key: boolean;
  probe_api_key_masked?: string;
  probe_key_updated_at?: string;
}

export interface Provider {
  id: number;
  slug: string;
  name: string;
  logo_url?: string;
  is_active: boolean;
  probe_config?: ProviderProbeConfig;
}

export interface ProviderCreate {
  slug: string;
  name: string;
  logo_url?: string;
  is_active?: boolean;
  probe_api_base_url?: string | null;
  probe_api_key?: string;
}

export interface OfferingCreate {
  provider_id: number;
  price_input_per_m?: number;
  price_output_per_m?: number;
  provider_model_id?: string;
}

export interface ModelProviderInfo {
  model_provider_id: number;
  provider_id: string;
  provider_name: string;
  provider_name_zh?: string;
  color?: string;
  api_model_name: string;
  routing_alias?: string;
  input_price_cny_1m?: number;
  output_price_cny_1m?: number;
  rate_limit_rpm: number;
  is_default: boolean;
}

const normalizeOffering = (offering: ModelOfferingResponse): ModelOfferingResponse => ({
  ...offering,
  provider_model_id: offering.provider_model_id ?? offering.provider_model_name,
  provider_model_name: offering.provider_model_name ?? offering.provider_model_id,
});

const normalizeOfferings = (offerings: ModelOfferingResponse[]): ModelOfferingResponse[] =>
  offerings.map(normalizeOffering);

export const testingApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await testingClient.get<ApiResponse<ListResponse<Category>>>(
      "/api/v1/models/categories"
    );
    return response.data.data.items;
  },

  getModels: async (params?: {
    category?: string;
    vendors?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }): Promise<ListResponse<ModelListItem>> => {
    const response = await testingClient.get<ApiResponse<ListResponse<ModelListItem>>>(
      "/api/v1/models",
      { params }
    );
    return response.data.data;
  },

  getAllModels: async (params?: {
    category?: string;
    vendors?: string;
    q?: string;
  }): Promise<ModelListItem[]> => {
    const items: ModelListItem[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const response = await testingApi.getModels({ ...params, page, page_size: pageSize });
      items.push(...response.items);

      if (items.length >= response.total || response.items.length === 0) {
        return items;
      }

      page += 1;
    }
  },

  getModelDetail: async (slug: string): Promise<ModelDetail> => {
    const response = await testingClient.get<ApiResponse<ModelDetail>>(`/api/v1/models/${slug}`);
    return {
      ...response.data.data,
      offerings: normalizeOfferings(response.data.data.offerings ?? []),
    };
  },

  createModel: async (data: ModelCreate): Promise<ModelDetail> => {
    const response = await testingClient.post<ApiResponse<ModelDetail>>("/api/v1/models", data);
    return response.data.data;
  },

  updateModel: async (slug: string, data: ModelUpdate): Promise<ModelDetail> => {
    const response = await testingClient.put<ApiResponse<ModelDetail>>(
      `/api/v1/models/${slug}`,
      data
    );
    return response.data.data;
  },

  getModelOfferings: async (slug: string): Promise<ModelOfferingResponse[]> => {
    const response = await testingClient.get<ApiResponse<ModelOfferingResponse[]>>(
      `/api/v1/models/${slug}/offerings`
    );
    return normalizeOfferings(response.data.data);
  },

  addOffering: async (slug: string, data: OfferingCreate): Promise<ModelOfferingResponse> => {
    const response = await testingClient.post<ApiResponse<ModelOfferingResponse>>(
      `/api/v1/models/${slug}/offerings`,
      data
    );
    return normalizeOffering(response.data.data);
  },

  deleteOffering: async (offeringId: number): Promise<void> => {
    await testingClient.delete(`/api/v1/model-providers/${offeringId}`);
  },

  getVendors: async (params?: { page?: number; page_size?: number }): Promise<ListResponse<Vendor>> => {
    const response = await testingClient.get<ApiResponse<ListResponse<Vendor>>>(
      "/api/v1/vendors",
      { params }
    );
    return response.data.data;
  },

  getAllVendors: async (): Promise<Vendor[]> => {
    const items: Vendor[] = [];
    let page = 1;
    const pageSize = 200;

    while (true) {
      const response = await testingApi.getVendors({ page, page_size: pageSize });
      items.push(...response.items);

      if (items.length >= response.total || response.items.length === 0) {
        return items;
      }

      page += 1;
    }
  },

  createVendor: async (data: VendorCreate): Promise<Vendor> => {
    const response = await testingClient.post<ApiResponse<Vendor>>("/api/v1/vendors", data);
    return response.data.data;
  },

  updateVendor: async (id: number, data: Partial<VendorCreate>): Promise<Vendor> => {
    const response = await testingClient.put<ApiResponse<Vendor>>(`/api/v1/vendors/${id}`, data);
    return response.data.data;
  },

  deleteVendor: async (id: number): Promise<void> => {
    await testingClient.delete(`/api/v1/vendors/${id}`);
  },

  getProviders: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ListResponse<Provider>> => {
    const response = await testingClient.get<ApiResponse<ListResponse<Provider>>>(
      "/api/v1/providers",
      { params }
    );
    return response.data.data;
  },

  createProvider: async (data: ProviderCreate): Promise<Provider> => {
    const response = await testingClient.post<ApiResponse<Provider>>("/api/v1/providers", data);
    return response.data.data;
  },

  updateProvider: async (id: number, data: Partial<ProviderCreate>): Promise<Provider> => {
    const response = await testingClient.put<ApiResponse<Provider>>(
      `/api/v1/providers/${id}`,
      data
    );
    return response.data.data;
  },

  deleteProvider: async (id: number): Promise<void> => {
    await testingClient.delete(`/api/v1/providers/${id}`);
  },

  triggerBenchmarkAll: async (): Promise<BenchmarkJobAcceptedResponse> => {
    const response = await testingClient.post<ApiResponse<BenchmarkJobAcceptedResponse>>(
      "/api/v1/benchmark/probe/trigger"
    );
    return response.data.data;
  },

  triggerBenchmarkOne: async (offeringId: number): Promise<BenchmarkJobAcceptedResponse> => {
    const response = await testingClient.post<ApiResponse<BenchmarkJobAcceptedResponse>>(
      `/api/v1/benchmark/probe/${offeringId}`
    );
    return response.data.data;
  },

  getBenchmarkJob: async (jobId: string): Promise<BenchmarkJobStatusResponse> => {
    const response = await testingClient.get<ApiResponse<BenchmarkJobStatusResponse>>(
      `/api/v1/benchmark/jobs/${jobId}`
    );
    return response.data.data;
  },

  getProbeAudits: async (params?: {
    offering_id?: number;
    job_id?: string;
    limit?: number;
  }): Promise<AdminProbeAuditListResponse> => {
    const response = await testingClient.get<ApiResponse<AdminProbeAuditListResponse>>(
      "/api/v1/benchmark/probe-audits",
      { params }
    );
    return response.data.data;
  },

  getBenchmarkStatsSummary: async (n = 5): Promise<BenchmarkStatsSummaryResponse> => {
    const response = await testingClient.get<ApiResponse<BenchmarkStatsSummaryResponse>>(
      "/api/v1/benchmark/stats/summary",
      {
        params: { n },
      }
    );
    return response.data.data;
  },

  getBenchmarkTrends: async (
    modelSlug: string,
    days = 7,
    region?: string
  ): Promise<BenchmarkTrendResponse> => {
    const response = await testingClient.get<ApiResponse<BenchmarkTrendResponse>>(
      "/api/v1/benchmark/trends",
      {
        params: {
          model_slug: modelSlug,
          days,
          ...(region ? { region } : {}),
        },
      }
    );
    return response.data.data;
  },
};
