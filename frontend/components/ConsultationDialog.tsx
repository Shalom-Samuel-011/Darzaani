"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { CalendarDays, Check, Clock3, X } from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface ConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  initialGarmentInterest?: string;
}

function localDateString() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function ConsultationDialog({
  open,
  onClose,
  initialGarmentInterest = "Sarees & blouses",
}: ConsultationDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("10:00–12:00");
  const [consultationType, setConsultationType] = useState("atelier");
  const [garmentInterest, setGarmentInterest] = useState(initialGarmentInterest);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName((current) => current || user.name || "");
    setEmail((current) => current || user.email || "");
    setPhone((current) => current || user.phone || "");
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/consultations", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        preferredDate,
        preferredTime,
        consultationType,
        garmentInterest,
        notes: notes.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      const requestError = err as AxiosError<{ message?: string }>;
      setError(
        requestError.response?.data?.message ||
          "We couldn’t send your consultation request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    if (loading) return;
    onClose();
    if (submitted) {
      setSubmitted(false);
      setPreferredDate("");
      setNotes("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#211a14]/65 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="consultation-title"
        className="relative max-h-[min(92vh,900px)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-[#e8dcc8] bg-[#fffdf8] shadow-[0_28px_90px_rgba(25,18,12,0.35)]"
      >
        <div className="border-b border-[#eee4d5] px-6 py-6 sm:px-9 sm:py-8">
          <button
            type="button"
            onClick={closeDialog}
            disabled={loading}
            aria-label="Close consultation booking"
            className="absolute right-5 top-5 rounded-full p-2 text-stone-500 transition hover:bg-[#f4eee3] hover:text-stone-900 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-800">
            A personal appointment
          </p>
          <h2 id="consultation-title" className="mt-2 pr-10 font-serif text-3xl text-stone-900 sm:text-4xl">
            Book a consultation
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-stone-600">
            Tell us a little about what you have in mind. We’ll contact you to confirm a time with our atelier.
          </p>
        </div>

        {submitted ? (
          <div className="px-6 py-12 text-center sm:px-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="mt-5 font-serif text-2xl text-stone-900">Your request is with our atelier</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">
              We’ll reach out using the contact details you provided to confirm your consultation date and time.
            </p>
            <button
              type="button"
              onClick={closeDialog}
              className="mt-7 rounded-full bg-[#873b20] px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-9 sm:py-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="consultation-name" className="mb-1.5 block text-sm font-medium text-stone-700">Your name</label>
                <input
                  id="consultation-name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label htmlFor="consultation-phone" className="mb-1.5 block text-sm font-medium text-stone-700">Phone number</label>
                <input
                  id="consultation-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  minLength={7}
                  maxLength={20}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="consultation-email" className="mb-1.5 block text-sm font-medium text-stone-700">Email address</label>
                <input
                  id="consultation-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="consultation-date" className="mb-1.5 block text-sm font-medium text-stone-700">Preferred date</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="consultation-date"
                    type="date"
                    required
                    min={localDateString()}
                    value={preferredDate}
                    onChange={(event) => setPreferredDate(event.target.value)}
                    className="w-full rounded-xl border border-[#e5dac8] bg-white py-3 pl-10 pr-3 text-sm text-stone-800 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="consultation-time" className="mb-1.5 block text-sm font-medium text-stone-700">Preferred time</label>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <select
                    id="consultation-time"
                    value={preferredTime}
                    onChange={(event) => setPreferredTime(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#e5dac8] bg-white py-3 pl-10 pr-9 text-sm text-stone-800 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15"
                  >
                    <option>10:00–12:00</option>
                    <option>12:00–14:00</option>
                    <option>14:00–16:00</option>
                    <option>16:00–18:00</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="consultation-type" className="mb-1.5 block text-sm font-medium text-stone-700">How would you like to meet?</label>
                <select
                  id="consultation-type"
                  value={consultationType}
                  onChange={(event) => setConsultationType(event.target.value)}
                  className="w-full rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15"
                >
                  <option value="atelier">At the atelier</option>
                  <option value="video">Video consultation</option>
                </select>
              </div>
              <div>
                <label htmlFor="consultation-garment" className="mb-1.5 block text-sm font-medium text-stone-700">What are you interested in?</label>
                <select
                  id="consultation-garment"
                  value={garmentInterest}
                  onChange={(event) => setGarmentInterest(event.target.value)}
                  className="w-full rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15"
                >
                  <option>Sarees & blouses</option>
                  <option>Kurtis & sets</option>
                  <option>Lehengas</option>
                  <option>Something else</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="consultation-notes" className="mb-1.5 block text-sm font-medium text-stone-700">Anything you’d like us to know? <span className="font-normal text-stone-400">(optional)</span></label>
              <textarea
                id="consultation-notes"
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full resize-y rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15"
                placeholder="Occasion, style ideas, or questions for the tailor…"
              />
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <div className="flex flex-col-reverse gap-3 border-t border-[#eee4d5] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={loading}
                className="rounded-full border border-[#dfd3c0] px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f6efe4] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#873b20] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? "Sending request…" : "Request consultation"}
              </button>
            </div>
            <p className="text-center text-xs leading-5 text-stone-500">
              Your requested time is not confirmed until our team contacts you.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
