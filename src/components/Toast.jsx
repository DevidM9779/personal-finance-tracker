import { useCallback, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { ToastContext } from "./toastContext";

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "success", duration = 3500 }) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ title, description, variant, onDismiss }) {
  const Icon =
    variant === "error" ? AlertCircle : variant === "info" ? Info : CheckCircle;
  const tone =
    variant === "error"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : variant === "info"
        ? "border-neutral-700 bg-neutral-900 text-neutral-200"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border ${tone} px-4 py-3 shadow-lg shadow-black/30 backdrop-blur`}
      role="status"
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        {description ? (
          <p className="text-xs opacity-80">{description}</p>
        ) : null}
      </div>
      <button
        onClick={onDismiss}
        className="text-neutral-400 transition hover:text-neutral-200"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

