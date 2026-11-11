"use client";

import { useMemo, useState } from "react";

type CheckboxItem = {
  id: string;
  label: string;
};

type CheckboxSearchProps = {
  items: CheckboxItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxHeight?: string;
};

export default function CheckboxSearch({
  items,
  selected,
  onChange,
  label,
  placeholder = "Cari...",
  required = false,
  disabled = false,
  maxHeight = "200px",
}: CheckboxSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => i.label.toLowerCase().includes(needle));
  }, [items, query]);

  const isSelected = (id: string) => selected.includes(id);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      isSelected(id) ? selected.filter((x) => x !== id) : [...selected, id]
    );
  };

  const selectedLabels = selected
    .map((id) => items.find((i) => i.id === id)?.label)
    .filter(Boolean);

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
        {selected.length > 0 && (
          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px]">
            <span className="text-emerald-600 font-bold">{selected.length}</span>
            <span className="text-slate-500">terpilih</span>
          </div>
        )}
      </div>

      <div
        className={`max-h-[${maxHeight}] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-sm space-y-1.5`}
      >
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">
            Tidak ada data yang cocok.
          </p>
        ) : (
          filtered.map((item) => {
            const checked = isSelected(item.id);
            return (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-lg p-2 cursor-pointer transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  disabled={disabled}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                />
                <span className={checked ? "text-slate-900 font-medium" : "text-slate-700"}>
                  {item.label}
                </span>
                </label>
              );
            })
        )}
      </div>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {selectedLabels.map((labelText) => (
            <span
              key={labelText}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
            >
              {labelText}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
