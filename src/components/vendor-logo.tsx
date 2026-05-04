"use client";

import { useEffect, useState } from "react";

interface VendorLogoProps {
  name: string;
  logoUrl?: string | null;
  /** 像素尺寸（同时控制宽高），默认 36 */
  size?: number;
  /** 圆角样式：sm=rounded-lg / md=rounded-xl，默认 sm */
  radius?: "sm" | "md";
  /** 额外样式类追加到外层元素 */
  className?: string;
}

/**
 * 渲染研发商 logo：优先使用 logoUrl，加载失败退化为首字母占位。
 *
 * 用原生 <img>（不走 next/image），避免 next.config remotePatterns 白名单约束 —
 * 后端可能返回外部 URL 或 /icons/... 这类相对路径。
 */
export function VendorLogo({
  name,
  logoUrl,
  size = 36,
  radius = "sm",
  className = "",
}: VendorLogoProps) {
  const trimmed = logoUrl?.trim();
  const [errored, setErrored] = useState(!trimmed);
  const radiusClass = radius === "md" ? "rounded-xl" : "rounded-lg";

  // logoUrl 变化时（切换研发商等场景）重置 error 状态以重试加载
  useEffect(() => {
    setErrored(!trimmed);
  }, [trimmed]);

  if (errored || !trimmed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600 ${radiusClass} ${className}`}
        style={{ width: size, height: size }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt={name}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${radiusClass} ${className}`}
      onError={() => setErrored(true)}
    />
  );
}

export default VendorLogo;
