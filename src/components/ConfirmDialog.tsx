import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (value: boolean) => void;
}

// Global confirm dispatcher — set by the provider
let dispatchConfirm: ((state: Omit<ConfirmState, 'resolve'>) => Promise<boolean>) | null = null;

/**
 * Drop-in replacement for `window.confirm()` that actually works on Capacitor iOS.
 * Returns a Promise<boolean>. Usage:
 *
 *   if (await confirmDialog({ title: 'Delete?', message: 'Are you sure?' })) {
 *     // user confirmed
 *   }
 */
export function confirmDialog(opts: Omit<ConfirmState, 'resolve'>): Promise<boolean> {
  if (!dispatchConfirm) {
    // Fallback for SSR or before provider mounts — use native confirm on web only
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return Promise.resolve(window.confirm(`${opts.title}\n\n${opts.message}`));
    }
    return Promise.resolve(false);
  }
  return dispatchConfirm(opts);
}

/**
 * Mount once near the root of the app. Provides the `confirmDialog()` function globally.
 */
export function ConfirmDialogProvider() {
  const [current, setCurrent] = useState<ConfirmState | null>(null);

  useEffect(() => {
    dispatchConfirm = (opts) =>
      new Promise<boolean>((resolve) => {
        setCurrent({ ...opts, resolve });
      });
    return () => {
      dispatchConfirm = null;
    };
  }, []);

  const handleConfirm = useCallback(() => {
    current?.resolve(true);
    setCurrent(null);
  }, [current]);

  const handleCancel = useCallback(() => {
    current?.resolve(false);
    setCurrent(null);
  }, [current]);

  // Close on Escape key
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter') handleConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, handleConfirm, handleCancel]);

  if (!current) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClick={handleCancel}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
      style={{ background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-2xl border border-border-medium bg-bg-elevated shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
        style={{ animation: 'confirm-enter 0.22s cubic-bezier(0.2, 1, 0.3, 1)' }}
      >
        <div className="p-5">
          <h2 id="confirm-title" className="font-heading text-[17px] font-bold text-text-primary mb-1.5 leading-tight">
            {current.title}
          </h2>
          <p id="confirm-message" className="text-[14px] text-text-secondary leading-relaxed whitespace-pre-line">
            {current.message}
          </p>
        </div>
        <div className="flex border-t border-border-subtle">
          <button
            onClick={handleCancel}
            className="flex-1 py-3.5 text-[15px] font-medium text-text-secondary bg-transparent border-none cursor-pointer active:bg-bg-subtle-strong min-h-[44px]"
          >
            {current.cancelLabel || 'Cancel'}
          </button>
          <div className="w-px bg-border-subtle" />
          <button
            onClick={handleConfirm}
            autoFocus
            className="flex-1 py-3.5 text-[15px] font-semibold bg-transparent border-none cursor-pointer active:scale-[0.98] min-h-[44px]"
            style={{
              color: current.destructive ? 'var(--status-red)' : 'var(--accent-amber)',
            }}
          >
            {current.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirm-enter {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
