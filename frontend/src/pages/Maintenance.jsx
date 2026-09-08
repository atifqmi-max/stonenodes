export default function Maintenance({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900/60 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-moss-500/15 text-moss-400">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2 2-1-1 2-2Z" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="mb-2 text-lg font-semibold text-stone-50">
          Stone<span className="text-moss-400">Nodes</span> is under maintenance
        </h1>
        <p className="text-sm text-stone-400">
          {message || "We're making some improvements. Please check back shortly."}
        </p>
      </div>
    </div>
  );
}
