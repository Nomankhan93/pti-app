import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <main className="px-4 py-12">
      <section className="page-wrap overflow-hidden rounded-[2rem] border border-white/70 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-700">
          BBJF
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Page not found
        </h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600">
          This page does not exist in the BBJF membership portal. Please return to the home page or open your member dashboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white no-underline hover:bg-black"
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 no-underline hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}
