"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import API from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/users/forgotPassword", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      const requestError = err as AxiosError<{ message?: string }>;
      setError(requestError.response?.data?.message || "Could not send the reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e7ddcc] bg-[#fffdf8] p-7 shadow-xl sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-800">Account access</p>
        <h1 className="mt-3 font-serif text-3xl text-stone-900">Forgot your password?</h1>
        {sent ? (
          <div className="mt-5 space-y-5">
            <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              If an account exists for that email, a password reset link is on its way. The link expires in five minutes.
            </p>
            <Link href="/login" className="inline-flex rounded-full bg-[#873b20] px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-800">
              Return to log in
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-stone-600">Enter the email address on your account and we’ll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label htmlFor="reset-email" className="block text-sm font-medium text-stone-700">Email address</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#e7ddcc] bg-white px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20"
                placeholder="you@example.com"
              />
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-full bg-[#873b20] px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:opacity-60">
                {loading ? "Sending link…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
