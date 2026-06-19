export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-[1450px] animate-pulse p-4 sm:p-6">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map(item => (
          <div key={item} className="h-28 rounded-[22px] border border-black/[0.05] bg-white/75 shadow-sm" />
        ))}
      </div>
      <div className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-white/80 shadow-sm">
        <div className="flex gap-3 border-b border-black/[0.05] p-4">
          <div className="h-10 flex-1 rounded-xl bg-black/[0.055]" />
          <div className="h-10 w-28 rounded-xl bg-black/[0.055]" />
        </div>
        <div className="space-y-4 p-6">
          {[0, 1, 2, 3, 4].map(item => (
            <div key={item} className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-[var(--studio-accent)]/30" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/5 rounded-full bg-black/[0.07]" />
                <div className="h-2.5 w-3/5 rounded-full bg-black/[0.045]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
