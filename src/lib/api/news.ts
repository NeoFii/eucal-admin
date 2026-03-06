import { apiClient, type ApiResponse } from "./client";

// 语言类型
export type Language = "zh" | "en";

// 新闻类型
export interface News {
  uid: string;
  language: Language;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
  content: string;
  status: 0 | 1 | 2;  // 0=草稿 1=已发布 2=已下线
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// 新闻列表项（不含content）
export interface NewsListItem {
  uid: string;
  language: Language;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
  status: 0 | 1 | 2;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// 新闻列表查询参数
export interface NewsParams {
  page?: number;
  page_size?: number;
  status?: number;
  language?: Language;
}

// 新闻列表响应
export interface NewsListResponse {
  items: NewsListItem[];
  total: number;
  page: number;
  page_size: number;
}

// 创建新闻请求
export interface CreateNewsRequest {
  title: string;
  slug: string;
  language?: Language;
  summary?: string;
  cover_image?: string;
  content: string;
  status?: 0 | 1 | 2;
  published_at?: string;
}

// 更新新闻请求
export interface UpdateNewsRequest {
  title?: string;
  slug?: string;
  language?: Language;
  summary?: string;
  cover_image?: string;
  content?: string;
  status?: 0 | 1 | 2;
  published_at?: string;
}

// 新闻 API
export const newsApi = {
  // 获取新闻列表（管理端，含全部状态）
  getList: async (params?: NewsParams): Promise<NewsListResponse> => {
    const response = await apiClient.get<ApiResponse<NewsListResponse>>("/api/v1/news", { params });
    return response.data.data;
  },

  // 获取新闻详情（按 uid）
  getDetail: async (uid: string): Promise<News> => {
    const response = await apiClient.get<ApiResponse<News>>(`/api/v1/news/${uid}`);
    return response.data.data;
  },

  // 创建新闻
  create: async (data: CreateNewsRequest): Promise<News> => {
    const response = await apiClient.post<ApiResponse<News>>("/api/v1/news", data);
    return response.data.data;
  },

  // 更新新闻
  update: async (uid: string, data: UpdateNewsRequest): Promise<News> => {
    const response = await apiClient.put<ApiResponse<News>>(`/api/v1/news/${uid}`, data);
    return response.data.data;
  },

  // 下线新闻（软删除）
  offline: async (uid: string): Promise<void> => {
    await apiClient.delete(`/api/v1/news/${uid}`);
  },
};
