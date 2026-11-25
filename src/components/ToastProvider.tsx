'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, Undo2, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  onUndo?: () => void | Promise<void>;
  undoLabel?: string;
}

interface ToastContextValue {
  showToast: (
    message: string,
    options?: { kind?: ToastKind; durationMs?: number; onUndo?: () => void | Promise<void>; undoLabel?: string }
  ) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {}
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      options?: { kind?: ToastKind; durationMs?: number; onUndo?: () => void | Promise<void>; undoLabel?: string }
    ) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const kind = options?.kind || 'success';
      const durationMs = options?.onUndo ? 5000 : options?.durationMs || 3800;

      setToasts(prev => [...prev.slice(-3), { id, kind, message, onUndo: options?.onUndo, undoLabel: options?.undoLabel }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, durationMs);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-20 right-4 left-4 sm:left-auto z-[70] flex flex-col gap-2.5 sm:max-w-md pointer-events-none"
      >
        {toasts.map(t => {
          const colors =
            t.kind === 'error'
              ? 'border-[var(--color-danger)] bg-[var(--bg-surface)] text-[var(--color-danger)]'
              : t.kind === 'success'
                ? 'border-[var(--color-success)] bg-[var(--bg-surface)] text-[var(--color-success)]'
                : 'border-[var(--color-primary)] bg-[var(--bg-surface)] text-[var(--color-primary)]';
          const Icon = t.kind === 'error' ? AlertCircle : t.kind === 'success' ? CheckCircle2 : Info;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl border-2 px-4 py-3 shadow-xl flex items-center justify-between gap-3 animate-scale-pop ${colors}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-heading font-semibold text-[var(--text-primary)] leading-snug">
                  {t.message}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {t.onUndo && (
                  <button
                    type="button"
                    onClick={async () => {
                      dismiss(t.id);
                      await t.onUndo?.();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-heading font-bold inline-flex items-center gap-1 cursor-pointer hover:opacity-90"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    {t.undoLabel || 'เลิกทำ'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="p-1 rounded-lg hover:bg-[var(--bg-surface-muted)] text-[var(--text-muted)] cursor-pointer"
                  aria-label="ปิดการแจ้งเตือน"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
