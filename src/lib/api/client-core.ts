import axios from "axios";
import { attachAuthRefreshInterceptor } from "./auth-interceptor";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const apiClient = axios.create({
  baseURL: "",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

attachAuthRefreshInterceptor(apiClient);

export default apiClient;
