import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const refreshClient = axios.create({
  baseURL: "",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

const isLoginRequest = (url?: string): boolean => (url ?? "").includes("/api/v1/auth/login");

const isRefreshRequest = (url?: string): boolean => (url ?? "").includes("/api/v1/auth/refresh");

const clearAuthAndRedirect = (): void => {
  useAuthStore.getState().clearAuth();

  if (typeof window === "undefined" || window.location.pathname === "/login") {
    return;
  }

  const redirectTarget = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const loginUrl = new URL("/login", window.location.origin);
  loginUrl.searchParams.set("redirect", redirectTarget);
  window.location.href = loginUrl.toString();
};

const refreshAuthSession = async (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/api/v1/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const attachAuthRefreshInterceptor = (client: AxiosInstance): void => {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status !== 401) {
        return Promise.reject(error);
      }

      const requestConfig = error.config as RetryableRequestConfig | undefined;
      const requestUrl = requestConfig?.url;

      if (!requestConfig || isLoginRequest(requestUrl)) {
        return Promise.reject(error);
      }

      if (requestConfig._retry || isRefreshRequest(requestUrl)) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      requestConfig._retry = true;

      try {
        await refreshAuthSession();
        return client(requestConfig);
      } catch (refreshError) {
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
          clearAuthAndRedirect();
        }

        return Promise.reject(refreshError);
      }
    }
  );
};
