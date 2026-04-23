"use client";

import { useCallback, useEffect, useState } from "react";

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

export function usePaginatedData<T>(
  fetcher: (params: { page: number; page_size: number }) => Promise<{ items: T[]; total: number }>,
  options?: {
    pageSize?: number;
    deps?: unknown[];
    onError?: (error: unknown) => void;
  },
): PaginatedResult<T> {
  const pageSize = options?.pageSize ?? 10;
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcher({ page, page_size: pageSize });
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      setItems([]);
      setTotal(0);
      options?.onError?.(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, ...(options?.deps ?? [])]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { items, total, page, pageSize, loading, setPage, refresh: fetchData };
}
