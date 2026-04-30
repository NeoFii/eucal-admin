const MICRO_YUAN = 1_000_000;

export function formatMicroYuanPerMillionTokens(value: number | null | undefined): string {
  if (value == null) return "-";
  return `¥${(value / MICRO_YUAN).toFixed(2)} / 1M tokens`;
}

/** @deprecated Use formatMicroYuanPerMillionTokens */
export const formatFenPerMillionTokens = formatMicroYuanPerMillionTokens;

export function formatYuan(microYuan: number): string {
  return `¥${(microYuan / MICRO_YUAN).toFixed(2)}`;
}

export function formatYuanDetail(microYuan: number): string {
  return `¥${(microYuan / MICRO_YUAN).toFixed(6)}`;
}

export function yuanToMicroYuan(yuan: string): number {
  const val = parseFloat(yuan);
  if (isNaN(val)) return 0;
  return Math.round(val * MICRO_YUAN);
}

export function microYuanToYuan(microYuan: number): string {
  return (microYuan / MICRO_YUAN).toFixed(6);
}

export function parseNonNegativeIntegerInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}
