"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export default function StyledFilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = `filter-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const closeWhenOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <span className="sr-only">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-orange-200 ${isOpen ? "border-orange-700" : "border-[#e8dcc8] hover:border-orange-400"}`}
      >
        <span className="truncate text-stone-700">{selectedOption?.label || "Choose an option"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          id={listId}
          role="group"
          aria-label={`${label} options`}
          className="absolute right-0 top-full z-40 mt-2 max-h-64 w-full min-w-[220px] overflow-y-auto rounded-2xl border border-[#e7ddcc] bg-[#fffdf8] p-1.5 shadow-xl shadow-stone-900/10"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={value === option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              className={`w-full rounded-xl px-3.5 py-2.5 text-left text-sm transition ${value === option.value ? "bg-orange-50 font-semibold text-orange-900" : "text-stone-700 hover:bg-[#f7f1e6] hover:text-stone-900"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
