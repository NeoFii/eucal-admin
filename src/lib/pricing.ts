export function formatFenPerMillionTokens(value: number | null | undefined): string {
  if (value == null) return "-";
  return `¥${(value / 100).toFixed(2)} / 1M tokens`;
}

export function parseNonNegativeIntegerInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}
