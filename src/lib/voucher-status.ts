export const VOUCHER_STATUS = {
  ACTIVE: 1,
  REDEEMED: 2,
  DISABLED: 3,
} as const;

export type VoucherDisplayState =
  | "valid"
  | "pending"
  | "expired"
  | "redeemed"
  | "disabled"
  | "unknown";

export interface VoucherStatusSource {
  status: number;
  starts_at: string;
  expires_at: string;
}

export function getVoucherDisplayState(
  code: VoucherStatusSource,
  now: Date = new Date(),
): VoucherDisplayState {
  if (code.status === VOUCHER_STATUS.ACTIVE) {
    if (new Date(code.expires_at) < now) return "expired";
    if (new Date(code.starts_at) > now) return "pending";
    return "valid";
  }
  if (code.status === VOUCHER_STATUS.REDEEMED) return "redeemed";
  if (code.status === VOUCHER_STATUS.DISABLED) return "disabled";
  return "unknown";
}

export function getVoucherStatusText(
  code: VoucherStatusSource,
  now?: Date,
): string {
  const state = getVoucherDisplayState(code, now);
  const labels: Record<VoucherDisplayState, string> = {
    valid: "有效",
    pending: "未生效",
    expired: "已过期",
    redeemed: "已兑换",
    disabled: "已作废",
    unknown: "未知",
  };
  return labels[state];
}

export function getVoucherStatusClass(
  code: VoucherStatusSource,
  now?: Date,
): string {
  const state = getVoucherDisplayState(code, now);
  const classNames: Record<VoucherDisplayState, string> = {
    valid: "bg-green-50 text-green-700 border-green-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    expired: "bg-red-50 text-red-700 border-red-200",
    redeemed: "bg-blue-50 text-blue-700 border-blue-200",
    disabled: "bg-red-50 text-red-700 border-red-200",
    unknown: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return classNames[state];
}
