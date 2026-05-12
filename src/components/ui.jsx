// Small set of UI primitives used across the app. Plain Tailwind to keep
// the dependency surface tiny.

export function Card({ className = "", children, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-neutral-800 bg-neutral-925 bg-neutral-900/60 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-4 px-5 pt-5 ${className}`}>
      <div className="min-w-0">
        {title ? (
          <h3 className="truncate text-sm font-medium text-neutral-200">
            {title}
          </h3>
        ) : null}
        {subtitle ? (
          <p className="mt-1 truncate text-xs text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className = "", children }) {
  return <div className={`px-5 py-5 ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint, tone = "neutral", className = "" }) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-rose-400"
        : "text-neutral-100";
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`tabular mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40";
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
    lg: "px-4 py-2.5 text-sm",
  };
  const variants = {
    primary:
      "bg-emerald-500 text-emerald-950 hover:bg-emerald-400 active:bg-emerald-500/90",
    secondary:
      "border border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800",
    ghost:
      "text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/60",
    danger:
      "border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
  };
  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-neutral-400">
          {label}
        </span>
      ) : null}
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] text-neutral-500">{hint}</span>
      ) : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/20";

export function Input(props) {
  return <input {...props} className={`${inputClass} ${props.className || ""}`} />;
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`${inputClass} appearance-none pr-8 ${props.className || ""}`}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`${inputClass} min-h-[80px] ${props.className || ""}`}
    />
  );
}

export function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "border-neutral-700 bg-neutral-900 text-neutral-300",
    positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    negative: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Empty({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {Icon ? (
        <div className="rounded-full border border-neutral-800 bg-neutral-900 p-3 text-neutral-400">
          <Icon size={20} />
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium text-neutral-200">{title}</p>
        {hint ? (
          <p className="mt-1 text-xs text-neutral-500">{hint}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
