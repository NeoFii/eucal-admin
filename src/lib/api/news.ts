import axios from "axios";
import { attachAuthRefreshInterceptor } from "./auth-interceptor";
import type { ApiResponse } from "./client";

const CONTENT_API_BASE_URL =
  process.env.NEXT_PUBLIC_CONTENT_API_URL || "http://localhost:8004";

const contentApiClient = axios.create({
  baseURL: CONTENT_API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

attachAuthRefreshInterceptor(contentApiClient);

// 新闻类型
export interface News {
  uid: string;
  language?: string | null;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
  content: string;
  status: 0 | 1 | 2 | 3;  // 0=草稿 1=已发布 2=已下线 3=已删除
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// 新闻列表项（不含content）
export interface NewsListItem {
  uid: string;
  language?: string | null;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
  status: 0 | 1 | 2 | 3;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// 新闻列表查询参数
export interface NewsParams {
  page?: number;
  page_size?: number;
  status?: number;
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
  summary?: string;
  cover_image?: string;
  content?: string;
  status?: 0 | 1 | 2 | 3;
  published_at?: string;
}

// 新闻 API
export const newsApi = {
  // 获取新闻列表（管理端，含全部状态）
  getList: async (params?: NewsParams): Promise<NewsListResponse> => {
    const response = await contentApiClient.get<ApiResponse<NewsListResponse>>(
      "/api/v1/admin/news",
      { params }
    );
    return response.data.data;
  },

  // 获取新闻详情（按 uid）
  getDetail: async (uid: string): Promise<News> => {
    const response = await contentApiClient.get<ApiResponse<News>>(
      `/api/v1/admin/news/${uid}`
    );
    return response.data.data;
  },

  // 创建新闻
  create: async (data: CreateNewsRequest): Promise<News> => {
    const response = await contentApiClient.post<ApiResponse<News>>(
      "/api/v1/admin/news",
      data
    );
    return response.data.data;
  },

  // 更新新闻
  update: async (uid: string, data: UpdateNewsRequest): Promise<News> => {
    const response = await contentApiClient.put<ApiResponse<News>>(
      `/api/v1/admin/news/${uid}`,
      data
    );
    return response.data.data;
  },

  // 下线新闻（软删除）
  offline: async (uid: string): Promise<void> => {
    await contentApiClient.delete(`/api/v1/admin/news/${uid}`);
  },

  // 删除新闻（软删除，status=3，管理端不再显示）
  destroy: async (uid: string): Promise<void> => {
    await contentApiClient.delete(`/api/v1/admin/news/${uid}/destroy`, {
      data: {},
    });
  },
};
