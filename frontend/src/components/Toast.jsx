import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, color: "var(--primary)", tint: "var(--primary-light)" },
  error: { icon: AlertCircle, color: "var(--danger)", tint: "var(--status-danger-bg)" },
  info: { icon: Info, color: "var(--stone)", tint: "var(--sand-light)" },
};

/**
 * Short-lived confirmations, anchored top-center.
 *
 * Toasts are announced politely to screen readers via the live region, and
 * they never carry information that exists nowhere else - a failed action
 * still shows its error inline on the form it came from.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, { tone = "success", duration = 3800 } = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, tone }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast,
      success: (m, o) => toast(m, { ...o, tone: "success" }),
      error: (m, o) => toast(m, { ...o, tone: "error", duration: 5200 }),
      info: (m, o) => toast(m, { ...o, tone: "info" }),
      dismiss,
    }),
    [toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  const reduced = useReducedMotion();

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info;
          const Icon = tone.icon;
          return (
            <motion.div
              key={t.id}
              className="toast"
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: -24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="toast-icon" style={{ background: tone.tint, color: tone.color }}>
                <Icon size={15} />
              </span>
              <span className="toast-message">{t.message}</span>
              <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss" className="toast-close">
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Returns { toast, success, error, info, dismiss }. Safe outside a provider. */
export function useToast() {
  return (
    useContext(ToastContext) || {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    }
  );
}

export default ToastProvider;
