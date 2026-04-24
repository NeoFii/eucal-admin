import { apiClient, type ApiResponse } from "./client";
import type {
  PaginatedResponse,
  ModelVendorItem,
  ModelVendorCreate,
  ModelVendorUpdate,
  ModelCategoryItem,
  ModelCategoryCreate,
  ModelCategoryUpdate,
  SupportedModelItem,
  SupportedModelDetail,
  SupportedModelCreate,
  SupportedModelUpdate,
} from "@/types";

const BASE = "/api/v1/admin/model-catalog";

export const modelCatalogApi = {
  getVendors: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<ModelVendorItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<ModelVendorItem>>>(`${BASE}/vendors`, { params });
    return response.data.data;
  },

  createVendor: async (data: ModelVendorCreate): Promise<ModelVendorItem> => {
    const response = await apiClient.post<ApiResponse<ModelVendorItem>>(`${BASE}/vendors`, data);
    return response.data.data;
  },

  updateVendor: async (slug: string, data: ModelVendorUpdate): Promise<ModelVendorItem> => {
    const response = await apiClient.patch<ApiResponse<ModelVendorItem>>(`${BASE}/vendors/${slug}`, data);
    return response.data.data;
  },

  getCategories: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<ModelCategoryItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<ModelCategoryItem>>>(`${BASE}/categories`, { params });
    return response.data.data;
  },

  createCategory: async (data: ModelCategoryCreate): Promise<ModelCategoryItem> => {
    const response = await apiClient.post<ApiResponse<ModelCategoryItem>>(`${BASE}/categories`, data);
    return response.data.data;
  },

  updateCategory: async (key: string, data: ModelCategoryUpdate): Promise<ModelCategoryItem> => {
    const response = await apiClient.patch<ApiResponse<ModelCategoryItem>>(`${BASE}/categories/${key}`, data);
    return response.data.data;
  },

  getModels: async (params?: {
    category?: string;
    vendors?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<SupportedModelItem>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<SupportedModelItem>>>(`${BASE}/models`, { params });
    return response.data.data;
  },

  getModelDetail: async (slug: string): Promise<SupportedModelDetail> => {
    const response = await apiClient.get<ApiResponse<SupportedModelDetail>>(`/api/v1/models/${slug}`);
    return response.data.data;
  },

  createModel: async (data: SupportedModelCreate): Promise<SupportedModelDetail> => {
    const response = await apiClient.post<ApiResponse<SupportedModelDetail>>(`${BASE}/models`, data);
    return response.data.data;
  },

  updateModel: async (slug: string, data: SupportedModelUpdate): Promise<SupportedModelDetail> => {
    const response = await apiClient.patch<ApiResponse<SupportedModelDetail>>(`${BASE}/models/${slug}`, data);
    return response.data.data;
  },

  deleteModel: async (slug: string): Promise<void> => {
    await apiClient.delete(`${BASE}/models/${slug}`);
  },

  getAllVendors: async (): Promise<ModelVendorItem[]> => {
    const all: ModelVendorItem[] = [];
    let page = 1;
    const pageSize = 200;
    while (true) {
      const data = await modelCatalogApi.getVendors({ page, page_size: pageSize });
      all.push(...data.items);
      if (all.length >= data.total) break;
      page++;
    }
    return all;
  },

  getAllModels: async (params?: { category?: string; vendors?: string; q?: string }): Promise<SupportedModelItem[]> => {
    const all: SupportedModelItem[] = [];
    let page = 1;
    const pageSize = 100;
    while (true) {
      const data = await modelCatalogApi.getModels({ ...params, page, page_size: pageSize });
      all.push(...data.items);
      if (all.length >= data.total) break;
      page++;
    }
    return all;
  },

  getAllCategories: async (): Promise<ModelCategoryItem[]> => {
    const all: ModelCategoryItem[] = [];
    let page = 1;
    const pageSize = 200;
    while (true) {
      const data = await modelCatalogApi.getCategories({ page, page_size: pageSize });
      all.push(...data.items);
      if (all.length >= data.total) break;
      page++;
    }
    return all;
  },
};
