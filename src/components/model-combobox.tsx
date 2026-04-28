"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AvailableModelSlug } from "@/types";

interface ModelComboboxProps {
  value: string;
  onChange: (value: string) => void;
  availableModels: AvailableModelSlug[];
  placeholder?: string;
  className?: string;
}

export function ModelCombobox({
  value,
  onChange,
  availableModels,
  placeholder = "选择或输入模型名称",
  className,
}: ModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = availableModels.filter((m) =>
    m.model_slug.toLowerCase().includes((search || value).toLowerCase())
  );

  const handleSelect = useCallback(
    (slug: string) => {
      onChange(slug);
      setSearch("");
      setOpen(false);
    },
    [onChange]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = search !== "" ? search : value;
  const hasNoCoverage =
    value.trim() !== "" && !availableModels.some((m) => m.model_slug === value);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm ring-offset-background transition-all placeholder:text-muted-foreground focus-visible:border-gray-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-950/5 focus-visible:ring-offset-0",
          hasNoCoverage ? "border-red-300" : "border-gray-200"
        )}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.map((m) => (
            <button
              key={m.model_slug}
              type="button"
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50",
                m.model_slug === value && "bg-gray-50 font-medium"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(m.model_slug)}
            >
              <span className="truncate">{m.model_slug}</span>
              <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                {m.pool_names.join("、")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
