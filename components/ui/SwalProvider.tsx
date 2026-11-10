"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type SwalTone = "success" | "error" | "warning" | "info" | "question";

type ConfirmOptions = {
  title: string;
  text?: string;
  tone?: SwalTone;
  confirmText?: string;
  cancelText?: string;
};

type AlertOptions = {
  title: string;
  text?: string;
  tone?: SwalTone;
  confirmText?: string;
};

type SwalContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
  success: (title: string, text?: string) => Promise<void>;
  error: (title: string, text?: string) => Promise<void>;
};

const SwalContext = createContext<SwalContextValue | null>(null);

type DialogState = {
  mode: "alert" | "confirm";
  tone: SwalTone;
  title: string;
  text?: string;
  confirmText: string;
  cancelText: string;
};

const TONE_STYLES: Record<
  SwalTone,
  { circle: string; button: string; icon: ReactNode }
> = {
  success: {
    circle: "bg-emerald-100 text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="m5 13 4 4L19 7" />
      </svg>
    ),
  },
  error: {
    circle: "bg-red-100 text-red-600",
    button: "bg-red-600 hover:bg-red-700 focus:ring-red-500/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    ),
  },
  warning: {
    circle: "bg-amber-100 text-amber-600",
    button: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    ),
  },
  info: {
    circle: "bg-sky-100 text-sky-600",
    button: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
    ),
  },
  question: {
    circle: "bg-emerald-100 text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.9.4-1.4 1-1.4 1.9v.3" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
};

export function SwalProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const open = useCallback((state: DialogState): Promise<boolean> => {
    setDialog(state);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setDialog(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      open({
        mode: "confirm",
        tone: options.tone ?? "question",
        title: options.title,
        text: options.text,
        confirmText: options.confirmText ?? "Ya, lanjutkan",
        cancelText: options.cancelText ?? "Batal",
      }),
    [open]
  );

  const alert = useCallback(
    (options: AlertOptions) =>
      open({
        mode: "alert",
        tone: options.tone ?? "info",
        title: options.title,
        text: options.text,
        confirmText: options.confirmText ?? "OK",
        cancelText: "",
      }).then(() => undefined),
    [open]
  );

  const success = useCallback(
    (title: string, text?: string) => alert({ title, text, tone: "success" }),
    [alert]
  );

  const error = useCallback(
    (title: string, text?: string) => alert({ title, text, tone: "error" }),
    [alert]
  );

  const value = useMemo(
    () => ({ confirm, alert, success, error }),
    [confirm, alert, success, error]
  );

  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
      if (event.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  const tone = dialog ? TONE_STYLES[dialog.tone] : null;

  return (
    <SwalContext.Provider value={value}>
      {children}
      {dialog && tone && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-center shadow-2xl"
          >
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${tone.circle}`}
            >
              {tone.icon}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{dialog.title}</h2>
            {dialog.text && (
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{dialog.text}</p>
            )}
            <div className="mt-6 flex items-center justify-center gap-2">
              {dialog.mode === "confirm" && (
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-300/30"
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-4 ${tone.button}`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </SwalContext.Provider>
  );
}

export function useSwal() {
  const context = useContext(SwalContext);
  if (!context) {
    throw new Error("useSwal harus dipakai di dalam <SwalProvider>.");
  }
  return context;
}
