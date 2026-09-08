export default function Modal({ open, onClose, title, children, width = "max-w-md" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${width} rounded-2xl border border-stone-700 bg-stone-900 p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-50">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
