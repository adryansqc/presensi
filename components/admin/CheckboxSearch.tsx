"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [selectAll, setSelectAll] = useState<'none' | 'partial' | 'all'>('none');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => i.label.toLowerCase().includes(needle));
  }, [items, query]);

  // Hitung status pilih semua otomatis terhadap item yang terfilter
  const isAllSelected = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every((i) => selected.includes(i.id));
  }, [filtered, selected]);

  const isNoneSelected = useMemo(() => {
    return filtered.every((i) => !selected.includes(i.id));
  }, [filtered, selected]);

  // Sinkronkan selectAll saat daftar terfilter berubah (misal saat pencarian)
  useEffect(() => {
    if (isAllSelected) {
      setSelectAll('all');
    } else if (isNoneSelected) {
      setSelectAll('none');
    } else {
      setSelectAll('partial');
    }
  }, [isAllSelected, isNoneSelected]);

  const isSelected = (id: string) => selected.includes(id);

  const toggle = useCallback(
    (id: string) => {
      if (disabled) return;
      onChange(
        isSelected(id) ? selected.filter((x) => x !== id) : [...selected, id]
      );
    },
    [disabled, isSelected, selected, onChange]
  );

  const handleSelectAll = useCallback(() => {
    if (selectAll === 'all') {
      onChange([]);
      setSelectAll('none');
    } else {
      onChange(filtered.map((i) => i.id));
      setSelectAll('all');
    }
  }, [selectAll, filtered, onChange]);

  const selectedLabels = selected
    .map((id) => items.find((i) => i.id === id)?.label)
    .filter(Boolean);

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {/* Baris Pilih Semua */}
      <div className="flex items-center gap-2 cursor-pointer transition hover:bg-slate-50/50 rounded-lg p-2">
        <input
          type="checkbox"
          checked={selectAll === 'all'}
          defaultChecked={selectAll === 'all'}
          onChange={handleSelectAll}
          disabled={disabled || filtered.length === 0}
          className={`h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 ${
            selectAll === 'partial'
              ? 'bg-white'
              : selectAll === 'all'
                ? 'bg-emerald-600 border-emerald-600 text-emerald-600'
                : 'bg-white border-slate-300 text-slate-500'
          }`}
          style={{ appearance: 'none' }}
        />
        <span className="text-sm font-medium text-slate-700">
          {selectAll === 'all' ? 'Batal Semua' : 'Pilih Semua'}
        </span>
        {selectAll === 'partial' && (
          <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0">
            sebagian
          </span>
        )}
      </div>

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
