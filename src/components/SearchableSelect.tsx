import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface SelectOption {
  key: string;
  label: string;
  searchText: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel
}: {
  options: SelectOption[];
  value: string;
  onChange: (key: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.searchText.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = options.find((o) => o.key === value)?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="searchable-select" ref={rootRef}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="select-trigger-label">{selectedLabel}</span>
        <span className="select-chevron" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div className="select-panel" role="listbox">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            autoFocus
          />
          <div className="select-options">
            {filtered.length === 0 ? (
              <div className="select-empty">{emptyLabel}</div>
            ) : (
              filtered.map((o) => (
                <button
                  type="button"
                  key={o.key}
                  role="option"
                  aria-selected={o.key === value}
                  className={o.key === value ? "select-option selected" : "select-option"}
                  onClick={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
          <div className="option-count">
            {filtered.length === 0 ? "" : query.trim() ? t("common.matches", { count: filtered.length }) : t("common.totalOptions", { count: options.length })}
          </div>
        </div>
      )}
    </div>
  );
}
