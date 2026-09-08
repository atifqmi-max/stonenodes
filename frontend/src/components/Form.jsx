export function Field({ label, children, hint }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm text-stone-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-stone-700 bg-stone-850 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none transition focus:border-moss-500 focus:ring-1 focus:ring-moss-500/50 ${
        props.className || ""
      }`}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-moss-500 focus:ring-1 focus:ring-moss-500/50 ${
        props.className || ""
      }`}
    >
      {props.children}
    </select>
  );
}

export function Button({ children, variant = "primary", className = "", ...rest }) {
  const styles = {
    primary: "bg-moss-500 text-stone-950 hover:bg-moss-400 shadow-glow font-semibold",
    ghost: "bg-transparent border border-stone-700 text-stone-200 hover:bg-stone-800",
    danger: "bg-red-900/60 border border-red-800 text-red-200 hover:bg-red-900",
    subtle: "bg-stone-800 text-stone-200 hover:bg-stone-700"
  };
  return (
    <button
      {...rest}
      className={`rounded-lg px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
