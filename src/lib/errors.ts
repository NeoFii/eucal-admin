import type { AxiosError } from "axios";

export function getErrorDetail(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
  return (
    axiosError.response?.data?.detail ||
    axiosError.response?.data?.message ||
    fallback
  );
}
