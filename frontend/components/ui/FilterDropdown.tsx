"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface FilterOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

interface Position {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export interface FilterDropdownProps<TValue extends string = string> {
  /** Accessible label for the dropdown */
  label: string;
  /** Currently selected value */
  value: TValue;
  /** Options to display */
  options: readonly FilterOption<TValue>[];
  /** Callback when selection changes */
  onChange: (value: TValue) => void;
  /** Optional placeholder when no option selected */
  placeholder?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Optional custom className for the trigger button */
  className?: string;
  /** Maximum height of the dropdown list */
  maxHeight?: number;
  /** Whether to render the dropdown in a portal (default: true for better positioning) */
  usePortal?: boolean;
  /** Optional: custom render for selected option in trigger */
  renderSelected?: (option: FilterOption<TValue> | undefined) => React.ReactNode;
}

export default function FilterDropdown<TValue extends string = string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose an option",
  disabled = false,
  className = "",
  maxHeight = 280,
  usePortal = true,
  renderSelected,
}: FilterDropdownProps<TValue>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const rect = trigger?.getBoundingClientRect();
      if (!trigger || !rect) return;

      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const roomBelow = window.innerHeight - rect.bottom - 12;
      const roomAbove = rect.top - 12;
      const placeBelow = roomBelow >= Math.min(maxHeight, roomAbove) || roomBelow >= 150;
      const calculatedMaxHeight = Math.max(100, Math.min(maxHeight, placeBelow ? roomBelow : roomAbove));
      const top = placeBelow ? rect.bottom + 8 : Math.max(8, rect.top - calculatedMaxHeight - 8);
      const parentRect = usePortal ? null : trigger.parentElement?.getBoundingClientRect();

      setPosition({
        top: top - (parentRect?.top ?? 0),
        left: left - (parentRect?.left ?? 0),
        width,
        maxHeight: calculatedMaxHeight,
      });
    };

    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
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
  }, [open, maxHeight, usePortal]);

  const triggerContent = (
    <span className="truncate flex items-center gap-2">
      {renderSelected ? (
        renderSelected(selectedOption)
      ) : (
        <>
          <span className={selectedOption ? "text-stone-900" : "text-stone-500"}>
            {selectedOption?.label || placeholder}
          </span>
          {selectedOption && (
            <Check className="h-3.5 w-3.5 text-orange-600 shrink-0" aria-hidden="true" />
          )}
        </>
      )}
    </span>
  );

  const dropdownMenu = (
    <div
      ref={menuRef}
      id={id}
      role="listbox"
      aria-label={`${label} options`}
      className="z-[100] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lg shadow-stone-900/10"
      style={{
        position: usePortal ? "fixed" : "absolute",
        top: position?.top,
        left: position?.left,
        width: position?.width,
        maxHeight: position?.maxHeight,
      }}
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
          className={`w-full rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
            value === option.value
              ? "bg-orange-50 font-semibold text-orange-900"
              : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <span className="sr-only">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={`inline-flex w-full min-h-11 items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2.5 text-left text-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50 ${className} ${
          open
            ? "border-orange-600 ring-2 ring-orange-100 shadow-md"
            : "border-stone-200 hover:border-orange-400 hover:shadow-sm"
        }`}
      >
        {triggerContent}
        <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && position && (usePortal ? createPortal(dropdownMenu, document.body) : dropdownMenu)}
    </div>
  );
}