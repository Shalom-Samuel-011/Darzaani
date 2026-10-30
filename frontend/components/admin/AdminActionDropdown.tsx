"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export interface ActionDropdownOption {
  value: string;
  label: string;
}

interface Position {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export default function AdminActionDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Choose an option",
}: {
  label: string;
  value: string;
  options: ActionDropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 190), window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const roomBelow = window.innerHeight - rect.bottom - 12;
      const roomAbove = rect.top - 12;
      const placeBelow = roomBelow >= Math.min(220, roomAbove) || roomBelow >= 150;
      const maxHeight = Math.max(100, Math.min(260, placeBelow ? roomBelow : roomAbove));
      setPosition({
        top: placeBelow ? rect.bottom + 6 : Math.max(8, rect.top - maxHeight - 6),
        left,
        width,
        maxHeight,
      });
    };

    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    updatePosition();
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={id}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      className={`inline-flex min-h-10 min-w-[132px] items-center justify-between gap-3 rounded-xl border bg-white px-3 text-left text-xs font-medium text-stone-700 outline-none transition focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50 ${open ? "border-orange-700 ring-2 ring-orange-100" : "border-[#e8dcc8] hover:border-orange-400"}`}
    >
      <span className="truncate">{selected?.label || placeholder}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && position && typeof document !== "undefined" && createPortal(
      <div
        ref={menuRef}
        id={id}
        role="listbox"
        aria-label={`${label} options`}
        style={{ position: "fixed", top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
        className="z-[150] overflow-y-auto rounded-xl border border-[#e7ddcc] bg-[#fffdf8] p-1.5 shadow-xl shadow-stone-900/15"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={value === option.value}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className={`block w-full rounded-lg px-3 py-2.5 text-left text-xs transition ${value === option.value ? "bg-orange-50 font-semibold text-orange-900" : "text-stone-700 hover:bg-[#f7f1e6] hover:text-stone-900"}`}
          >
            {option.label}
          </button>
        ))}
      </div>,
      document.body,
    )}
  </>;
}
