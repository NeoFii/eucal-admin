import type { AxiosError } from "axios";

export function getErrorDetail(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ code?: number; message?: string }>;
  return axiosError.response?.data?.message || fallback;
}
