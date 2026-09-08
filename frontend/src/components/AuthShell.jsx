export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-moss-500/15 text-moss-400">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 8v8l7-4-7-4Z" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-50">
            Stone<span className="text-moss-400">Nodes</span>
          </h1>
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-7 shadow-2xl">
          <h2 className="mb-5 text-lg font-semibold text-stone-100">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
