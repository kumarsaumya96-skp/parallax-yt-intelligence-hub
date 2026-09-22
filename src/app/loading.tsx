export default function Loading() {
  return <div className="space-y-5" aria-label="Loading"><div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" /><div className="h-5 w-[480px] max-w-full animate-pulse rounded-lg bg-slate-200" /><div className="grid-auto-cards pt-5">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div></div>;
}
