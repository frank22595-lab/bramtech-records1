import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/* -----------------------------------------------------------
 * Button
 * ----------------------------------------------------------- */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
    "transition-all duration-150 " +
    "disabled:opacity-50 disabled:cursor-not-allowed " +
    "active:scale-[0.98] " +
    "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };
  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow",
    secondary:
      "bg-white text-ink border border-slate-300 hover:bg-slate-50 hover:border-slate-400",
    ghost: "text-ink-soft hover:bg-slate-100 hover:text-ink",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* -----------------------------------------------------------
 * IconButton (square, icon-only)
 * ----------------------------------------------------------- */
export function IconButton({
  children,
  variant = "ghost",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg transition-all duration-150 " +
    "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.94] " +
    "focus:outline-none focus:ring-2 focus:ring-brand-500 " +
    "w-9 h-9";
  const variants = {
    ghost: "text-ink-soft hover:bg-slate-100 hover:text-ink",
    outline: "border border-slate-300 text-ink hover:bg-slate-50",
    solid: "bg-brand-600 text-white hover:bg-brand-700",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/* -----------------------------------------------------------
 * Input
 * ----------------------------------------------------------- */
export function Input({ label, error, hint, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </span>
      )}
      <input
        className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm 
          bg-white transition-colors
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 
          disabled:bg-slate-50 disabled:cursor-not-allowed 
          ${error ? "border-red-400 focus:ring-red-500 focus:border-red-500" : ""} ${className}`}
        {...props}
      />
      {hint && !error && (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      )}
      {error && (
        <span className="block text-xs text-red-600 mt-1">{error}</span>
      )}
    </label>
  );
}

/* -----------------------------------------------------------
 * Select
 * ----------------------------------------------------------- */
export function Select({
  label,
  error,
  hint,
  children,
  className = "",
  ...props
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </span>
      )}
      <select
        className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm 
          bg-white transition-colors cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 
          disabled:bg-slate-50 disabled:cursor-not-allowed 
          ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error && (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      )}
      {error && (
        <span className="block text-xs text-red-600 mt-1">{error}</span>
      )}
    </label>
  );
}

/* -----------------------------------------------------------
 * Card — optionally hoverable/clickable
 * ----------------------------------------------------------- */
export function Card({ children, className = "", hover = false, ...props }) {
  const hoverStyles = hover
    ? "hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer transition-all duration-150"
    : "";
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/* -----------------------------------------------------------
 * Spinner
 * ----------------------------------------------------------- */
export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-ink-soft">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* -----------------------------------------------------------
 * Badge
 * ----------------------------------------------------------- */
export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    brand: "bg-brand-100 text-brand-700",
    default: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}

/* -----------------------------------------------------------
 * BackButton — navigates back in history
 * ----------------------------------------------------------- */
export function BackButton({ to, label = "Back", className = "" }) {
  const navigate = useNavigate();
  const onClick = () => {
    if (to) navigate(to);
    else navigate(-1);
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors mb-4 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );
}

/* -----------------------------------------------------------
 * PageHeader — consistent page header with optional back button
 * ----------------------------------------------------------- */
export function PageHeader({ title, description, backTo, actions, badges }) {
  return (
    <div className="mb-6">
      {backTo !== undefined && (
        <BackButton to={backTo === true ? undefined : backTo} />
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-2xl font-semibold text-ink">
              {title}
            </h1>
            {badges}
          </div>
          {description && (
            <p className="text-sm text-ink-soft mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
 * Alert / Toast — inline feedback message
 * ----------------------------------------------------------- */
export function Alert({ children, tone = "info", onDismiss, className = "" }) {
  const config = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      Icon: Info,
      iconColor: "text-blue-600",
    },
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      Icon: CheckCircle2,
      iconColor: "text-emerald-600",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      Icon: AlertCircle,
      iconColor: "text-amber-600",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      Icon: AlertCircle,
      iconColor: "text-red-600",
    },
  };
  const { bg, border, text, Icon, iconColor } = config[tone] || config.info;
  return (
    <div
      className={`${bg} ${border} border rounded-lg p-3 flex items-start gap-2.5 ${className}`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className={`text-sm ${text} flex-1`}>{children}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`p-0.5 rounded hover:bg-black/5 ${text} opacity-60 hover:opacity-100`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* -----------------------------------------------------------
 * EmptyState — nicer than a plain Card
 * ----------------------------------------------------------- */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="p-8 md:p-12 text-center">
      {Icon && <Icon className="w-10 h-10 text-slate-300 mx-auto mb-3" />}
      {title && <h3 className="font-medium text-ink mb-1">{title}</h3>}
      {description && (
        <p className="text-sm text-ink-soft mb-4">{description}</p>
      )}
      {action}
    </Card>
  );
}
