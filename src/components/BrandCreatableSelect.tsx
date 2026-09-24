import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import "./BrandCreatableSelect.css";

export type SelectOption = { value: string; label: string };

type BrandCreatableSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  required?: boolean;
  emptyOptionLabel?: string;
  onCreate?: (name: string) => Promise<string | void> | string | void;
  createItemLabel?: (name: string) => string;
  disabled?: boolean;
};

function normalizeArabic(text: string): string {
  return text
    .trim()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .toLowerCase();
}

export function BrandCreatableSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  required = false,
  emptyOptionLabel,
  onCreate,
  createItemLabel,
  disabled = false,
}: BrandCreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 30);
    }
  }, [isOpen]);

  // Filter options
  const filteredOptions = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return options;
    return options.filter((opt) => normalizeArabic(opt.label).includes(q));
  }, [options, query]);

  // Check exact match
  const hasExactMatch = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return false;
    return options.some((opt) => normalizeArabic(opt.label) === q);
  }, [options, query]);

  const showCreateOption = Boolean(onCreate && query.trim().length > 0 && !hasExactMatch);
  const showEmptyOption = Boolean(emptyOptionLabel && !query.trim());

  // Current display text
  const selectedOption = options.find((opt) => opt.value === value);
  let displayText = selectedOption?.label || "";
  if (!displayText && emptyOptionLabel && (!value || value === "")) {
    displayText = emptyOptionLabel;
  }
  const isPlaceholder = !displayText;
  if (!displayText) {
    displayText = placeholder;
  }

  async function handleCreate() {
    const trimmed = query.trim();
    if (!onCreate || !trimmed || isCreating) return;
    try {
      setIsCreating(true);
      const newId = await onCreate(trimmed);
      if (newId) {
        onValueChange(String(newId));
      }
      setIsOpen(false);
      setQuery("");
    } catch {
      // Error handled by parent handler
    } finally {
      setIsCreating(false);
    }
  }

  function handleSelectOption(optVal: string) {
    onValueChange(optVal);
    setIsOpen(false);
    setQuery("");
  }

  // Flattened items for keyboard navigation:
  // [0: createOption?], [emptyOption?], ...filteredOptions
  const totalItemsCount = (showCreateOption ? 1 : 0) + (showEmptyOption ? 1 : 0) + filteredOptions.length;

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItemsCount ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, totalItemsCount - 1)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showCreateOption && highlightedIndex === 0) {
        void handleCreate();
        return;
      }

      let offset = showCreateOption ? 1 : 0;
      if (showEmptyOption) {
        if (highlightedIndex === offset) {
          handleSelectOption("");
          return;
        }
        offset += 1;
      }

      const optIndex = highlightedIndex - offset;
      if (filteredOptions[optIndex]) {
        handleSelectOption(filteredOptions[optIndex].value);
      } else if (showCreateOption) {
        void handleCreate();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="brand-creatable-wrapper" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Native hidden required input for form validation */}
      {required && (
        <input
          tabIndex={-1}
          required={required}
          value={value}
          onChange={() => {}}
          style={{ opacity: 0, height: 0, width: 0, position: "absolute", pointerEvents: "none" }}
        />
      )}

      {/* Main trigger button */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        className={`brand-creatable-trigger ${isOpen ? "open" : ""} ${isPlaceholder ? "placeholder" : ""}`}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
      >
        <span className="brand-creatable-trigger-text">{displayText}</span>
        <span className="brand-creatable-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="brand-creatable-dropdown" dir="rtl">
          <div className="brand-creatable-search-box">
            <span className="brand-creatable-search-icon">🔍</span>
            <input
              ref={searchInputRef}
              className="brand-creatable-search-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={`ابحث أو اكتب ${label} جديد...`}
            />
            {query && (
              <button
                type="button"
                className="brand-creatable-clear-btn"
                title="مسح البحث"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
              >
                ×
              </button>
            )}
          </div>

          <div className="brand-creatable-viewport">
            {/* Quick Creatable Option */}
            {showCreateOption && (
              <button
                type="button"
                className={`brand-creatable-add-option ${highlightedIndex === 0 ? "highlighted" : ""}`}
                onClick={() => void handleCreate()}
                disabled={isCreating}
              >
                <span>
                  ➕ {createItemLabel ? createItemLabel(query.trim()) : `إضافة "${query.trim()}" كـ ${label} جديد`}
                </span>
                <small>{isCreating ? "جارٍ الحفظ..." : "(اضغط Enter)"}</small>
              </button>
            )}

            {/* Empty Choice (e.g. "بدون مورد") */}
            {showEmptyOption && (
              <div
                className={`brand-creatable-item ${!value ? "selected" : ""} ${
                  highlightedIndex === (showCreateOption ? 1 : 0) ? "highlighted" : ""
                }`}
                onClick={() => handleSelectOption("")}
              >
                <span>{emptyOptionLabel}</span>
                {!value && <span className="brand-creatable-check">✓</span>}
              </div>
            )}

            {/* Filtered Options List */}
            {filteredOptions.map((opt, i) => {
              const itemIndex = (showCreateOption ? 1 : 0) + (showEmptyOption ? 1 : 0) + i;
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  className={`brand-creatable-item ${isSelected ? "selected" : ""} ${
                    highlightedIndex === itemIndex ? "highlighted" : ""
                  }`}
                  onClick={() => handleSelectOption(opt.value)}
                >
                  <span>{opt.label}</span>
                  {isSelected && <span className="brand-creatable-check">✓</span>}
                </div>
              );
            })}

            {/* Empty state */}
            {filteredOptions.length === 0 && !showCreateOption && !showEmptyOption && (
              <div className="brand-creatable-empty">
                لا توجد عناصر مطابقة
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
