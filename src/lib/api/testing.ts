import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'

// Testing 服务独立 API 响应格式（与 admin 服务一致）
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

const TESTING_BASE_URL = process.env.NEXT_PUBLIC_TESTING_API_URL || 'http://localhost:8002'

// 为 testing 服务创建独立的 Axios 实例
const testingClient = axios.create({
  baseURL: TESTING_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Testing 服务的 401 拦截器
testingClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ========== 分类 ==========

export interface Category {
  id: number
  key: string
  name: string
  sort_order: number
  is_active: boolean
}

export interface CategoryCreate {
  key: string
  name: string
  sort_order?: number
  is_active?: boolean
}

export interface ListResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ========== 模型 ==========

export interface ModelVendorBrief {
  id: number
  slug: string
  name: string
  logo_url?: string
}

export interface ModelCategoryBrief {
  key: string
  name: string
  sort_order: number
}

export interface ModelListItem {
  id: number
  slug: string
  name: string
  description?: string
  capability_tags: string[]
  context_window?: number
  max_output_tokens?: number
  is_reasoning_model: boolean
  sort_order: number
  vendor: ModelVendorBrief
  categories: ModelCategoryBrief[]
  providers?: ProviderBrief[]
}

export interface ProviderBrief {
  id: number
  slug: string
  name: string
  logo_url?: string
}

export interface ModelOfferingResponse {
  id: number
  provider: ProviderBrief
  price_input_per_m?: number
  price_output_per_m?: number
  provider_model_id?: string
  price_updated_at?: string
  is_active: boolean
}

export interface ModelDetail extends ModelListItem {
  is_active: boolean
  offerings: ModelOfferingResponse[]
}

export interface ModelCategoryAssign {
  category_id: number
  sort_order: number
}

export interface ModelCreate {
  vendor_id: number
  slug: string
  name: string
  description?: string
  capability_tags: string[]
  context_window?: number
  max_output_tokens?: number
  is_reasoning_model: boolean
  sort_order: number
  is_active: boolean
  categories: ModelCategoryAssign[]
}

export interface ModelUpdate {
  name?: string
  description?: string
  capability_tags?: string[]
  context_window?: number
  max_output_tokens?: number
  is_reasoning_model?: boolean
  sort_order?: number
  is_active?: boolean
  categories?: ModelCategoryAssign[]
}

// ========== 研发商 ==========

export interface Vendor {
  id: number
  slug: string
  name: string
  logo_url?: string
  is_active: boolean
}

export interface VendorCreate {
  slug: string
  name: string
  logo_url?: string
  is_active?: boolean
}

// ========== 供应商 ==========

export interface Provider {
  id: number
  slug: string
  name: string
  logo_url?: string
  is_active: boolean
}

export interface ProviderCreate {
  slug: string
  name: string
  logo_url?: string
  is_active?: boolean
}

// ========== 模型供应商关联 ==========

export interface OfferingCreate {
  provider_id: number
  price_input_per_m?: number
  price_output_per_m?: number
  provider_model_id?: string
}

export interface OfferingUpdate {
  price_input_per_m?: number
  price_output_per_m?: number
  provider_model_id?: string
  is_active?: boolean
}

export interface ModelProviderInfo {
  model_provider_id: number
  provider_id: string
  provider_name: string
  provider_name_zh?: string
  color?: string
  api_model_name: string
  routing_alias?: string
  input_price_cny_1m?: number
  output_price_cny_1m?: number
  rate_limit_rpm: number
  is_default: boolean
}

// ========== API ==========

export const testingApi = {
  // 分类
  getCategories: async (): Promise<Category[]> => {
    const response = await testingClient.get<ApiResponse<ListResponse<Category>>>('/api/v1/models/categories')
    return response.data.data.items
  },

  createCategory: async (data: CategoryCreate): Promise<Category> => {
    const response = await testingClient.post<ApiResponse<Category>>('/api/v1/models/categories', data)
    return response.data.data
  },

  deleteCategory: async (id: number): Promise<void> => {
    await testingClient.delete(`/api/v1/models/categories/${id}`)
  },

  // 模型
  getModels: async (params?: { category?: string; page?: number; page_size?: number }): Promise<ListResponse<ModelListItem>> => {
    const response = await testingClient.get<ApiResponse<ListResponse<ModelListItem>>>('/api/v1/models', { params })
    return response.data.data
  },

  getModelDetail: async (slug: string): Promise<ModelDetail> => {
    const response = await testingClient.get<ApiResponse<ModelDetail>>(`/api/v1/models/${slug}`)
    return response.data.data
  },

  createModel: async (data: ModelCreate): Promise<ModelDetail> => {
    const response = await testingClient.post<ApiResponse<ModelDetail>>('/api/v1/models', data)
    return response.data.data
  },

  updateModel: async (slug: string, data: ModelUpdate): Promise<ModelDetail> => {
    const response = await testingClient.put<ApiResponse<ModelDetail>>(`/api/v1/models/${slug}`, data)
    return response.data.data
  },

  deleteModel: async (slug: string): Promise<void> => {
    await testingClient.delete(`/api/v1/models/${slug}`)
  },

  // 模型 offerings 管理
  getModelOfferings: async (slug: string): Promise<ModelOfferingResponse[]> => {
    const response = await testingClient.get<ApiResponse<ModelOfferingResponse[]>>(`/api/v1/models/${slug}/offerings`)
    return response.data.data
  },

  addOffering: async (slug: string, data: OfferingCreate): Promise<ModelOfferingResponse> => {
    const response = await testingClient.post<ApiResponse<ModelOfferingResponse>>(`/api/v1/models/${slug}/offerings`, data)
    return response.data.data
  },

  deleteOffering: async (offeringId: number): Promise<void> => {
    await testingClient.delete(`/api/v1/model-providers/${offeringId}`)
  },

  updateOffering: async (offeringId: number, data: OfferingUpdate): Promise<ModelOfferingResponse> => {
    const response = await testingClient.put<ApiResponse<ModelOfferingResponse>>(
      `/api/v1/model-providers/${offeringId}`, data
    )
    return response.data.data
  },

  // 研发商
  getVendors: async (params?: { page?: number; page_size?: number }): Promise<ListResponse<Vendor>> => {
    const response = await testingClient.get<ApiResponse<ListResponse<Vendor>>>('/api/v1/vendors', { params })
    return response.data.data
  },

  createVendor: async (data: VendorCreate): Promise<Vendor> => {
    const response = await testingClient.post<ApiResponse<Vendor>>('/api/v1/vendors', data)
    return response.data.data
  },

  updateVendor: async (id: number, data: Partial<VendorCreate>): Promise<Vendor> => {
    const response = await testingClient.put<ApiResponse<Vendor>>(`/api/v1/vendors/${id}`, data)
    return response.data.data
  },

  deleteVendor: async (id: number): Promise<void> => {
    await testingClient.delete(`/api/v1/vendors/${id}`)
  },

  // 供应商
  getProviders: async (params?: { page?: number; page_size?: number }): Promise<ListResponse<Provider>> => {
    const response = await testingClient.get<ApiResponse<ListResponse<Provider>>>('/api/v1/providers', { params })
    return response.data.data
  },

  getProviderDetail: async (providerId: string): Promise<Provider> => {
    const response = await testingClient.get<ApiResponse<Provider>>(`/api/v1/providers/${providerId}`)
    return response.data.data
  },

  createProvider: async (data: ProviderCreate): Promise<Provider> => {
    const response = await testingClient.post<ApiResponse<Provider>>('/api/v1/providers', data)
    return response.data.data
  },

  updateProvider: async (id: number, data: Partial<ProviderCreate>): Promise<Provider> => {
    const response = await testingClient.put<ApiResponse<Provider>>(`/api/v1/providers/${id}`, data)
    return response.data.data
  },

  deleteProvider: async (id: number): Promise<void> => {
    await testingClient.delete(`/api/v1/providers/${id}`)
  },

  // 模型供应商关联
  getModelProviders: async (modelId: string): Promise<ModelProviderInfo[]> => {
    const response = await testingClient.get<ApiResponse<{ items: ModelProviderInfo[] }>>(`/api/v1/models/${modelId}/providers`)
    return response.data.data.items
  },

  addModelProvider: async (modelId: string, data: {
    provider_id: number
    api_model_name: string
    routing_alias?: string
    input_price_cny_1m?: number
    output_price_cny_1m?: number
    rate_limit_rpm?: number
    is_default?: boolean
  }): Promise<ModelProviderInfo> => {
    const response = await testingClient.post<ApiResponse<ModelProviderInfo>>(`/api/v1/models/${modelId}/providers`, data)
    return response.data.data
  },

  deleteModelProvider: async (modelProviderId: number): Promise<void> => {
    await testingClient.delete(`/api/v1/model-providers/${modelProviderId}`)
  },
}
