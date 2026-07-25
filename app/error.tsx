"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-background px-6 text-center"><div><p className="text-sm font-medium text-cyan-300">Something went wrong</p><h1 className="mt-2 text-3xl font-bold">We could not load this page.</h1><button onClick={reset} className="mt-6 rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">Try again</button></div></main>;
}
