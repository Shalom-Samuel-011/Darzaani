"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(password)) {
      setError("Use at least 8 characters, including uppercase, lowercase, and a number.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await API.patch(`/users/resetPassword/${encodeURIComponent(token)}`, {
        password,
        passwordConfirm,
      });
      login(response.data.token, response.data.data.user);
      router.push("/catalog");
    } catch (err) {
      const requestError = err as AxiosError<{ message?: string }>;
      setError(requestError.response?.data?.message || "This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e7ddcc] bg-[#fffdf8] p-7 shadow-xl sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-800">Account access</p>
        <h1 className="mt-3 font-serif text-3xl text-stone-900">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">Use at least eight characters. You’ll be signed in after the password is reset.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-stone-700">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#e7ddcc] bg-white px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-stone-700">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="w-full rounded-xl border border-[#e7ddcc] bg-white px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full bg-[#873b20] px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:opacity-60">
            {loading ? "Updating password…" : "Update password"}
          </button>
        </form>
        <Link href="/login" className="mt-5 inline-flex text-sm font-medium text-orange-800 hover:text-orange-900">Back to log in</Link>
      </section>
    </main>
  );
}
