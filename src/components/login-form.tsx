"use client";

import { ArrowRight, BarChart3, Eye, EyeOff, LockKeyhole, Radar, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/parallax/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          remember: formData.get("remember") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Sign in failed.");
      router.replace(nextPath);
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="parallax-login">
      <section className="parallax-login__story" aria-label="About Parallax">
        <div className="parallax-login__story-grid" aria-hidden="true" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
              <Radar size={22} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">Parallax</p>
              <p className="text-sm text-white/60">YouTube Intelligence Hub</p>
            </div>
          </div>

          <div className="max-w-xl py-12">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-violet-200">
              One view. Every signal.
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Turn channel performance into clear next moves.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
              Monitor owned channels, understand content performance and deliver client-ready
              intelligence from one workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
              <BarChart3 size={19} className="text-violet-300" />
              <p className="mt-3 text-sm font-semibold">Performance clarity</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Bring channel, video and audience signals together.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
              <ShieldCheck size={19} className="text-violet-300" />
              <p className="mt-3 text-sm font-semibold">Unified workspace</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Keep reporting, recommendations and delivery in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="parallax-login__form-wrap">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-xs font-black text-white">
              PX
            </div>
            <div>
              <p className="font-bold">Parallax</p>
              <p className="text-sm text-[var(--muted)]">YouTube Intelligence Hub</p>
            </div>
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Welcome back
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[var(--ink)]">
            Sign in to Parallax
          </h2>
          <p className="mt-3 text-base leading-7 text-[var(--muted)]">
            Enter your workspace credentials to continue.
          </p>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-[var(--ink)]">
              Work email
              <input
                className="mt-2 h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-violet-100"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="name@company.com"
                required
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink)]">
              Password
              <span className="relative mt-2 block">
                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white pl-11 pr-12 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-violet-100"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  minLength={8}
                  required
                />
                <button
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                name="remember"
                className="size-4 rounded border-slate-300 accent-[var(--accent)]"
              />
              Keep me signed in on this device
            </label>

            {error && (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-base font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in to Parallax"}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          {process.env.NODE_ENV !== "production" && (
            <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              Local preview: use any valid email and a password with at least 8 characters.
            </p>
          )}

          <p className="mt-10 text-sm text-[var(--muted)]">Parallax — YouTube Intelligence Hub</p>
        </div>
      </section>
    </main>
  );
}
