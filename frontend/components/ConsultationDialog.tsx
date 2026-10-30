"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { CalendarDays, Check, Clock3, X, MapPin, Loader } from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Branch } from "@/types";

interface ConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  initialGarmentInterest?: string;
}

interface ConsultationTimeSlot {
  key: string;
  value: string;
  label: string;
  available: boolean;
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
  const [preferredTime, setPreferredTime] = useState("");
  const [timeSlots, setTimeSlots] = useState<ConsultationTimeSlot[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [timeSlotsError, setTimeSlotsError] = useState("");
  const [slotRefresh, setSlotRefresh] = useState(0);
  const [consultationType, setConsultationType] = useState("atelier");
  const [garmentInterest, setGarmentInterest] = useState(initialGarmentInterest);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Branch geolocation states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState("");

  useEffect(() => {
    if (!user) return;
    // Prefill form values after auth restores the signed-in user.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const fetchAllBranches = useCallback(async () => {
    try {
      const response = await API.get("/branches");
      const allBranches = response.data.data.branches;
      setBranches(allBranches);
      if (allBranches.length > 0) setSelectedBranch(allBranches[0]._id);
    } catch (requestError) {
      const axiosError = requestError as AxiosError<{ message?: string }>;
      setBranchError(axiosError.response?.data?.message || "Could not fetch branches.");
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  const fetchNearestBranches = useCallback(async () => {
    setLoadingBranches(true);
    setBranchError("");
    if (!navigator.geolocation) {
      await fetchAllBranches();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await API.get(`/branches/nearest?lng=${longitude}&lat=${latitude}`);
          const fetchedBranches = response.data.data.branches;
          setBranches(fetchedBranches);
          if (fetchedBranches.length > 0) setSelectedBranch(fetchedBranches[0]._id);
          setLoadingBranches(false);
        } catch (requestError) {
          const axiosError = requestError as AxiosError<{ message?: string }>;
          setBranchError(axiosError.response?.data?.message || "Could not fetch nearby branches.");
          await fetchAllBranches();
        }
      },
      () => { void fetchAllBranches(); },
    );
  }, [fetchAllBranches]);

  // Fetch nearby branches when the dialog opens.
  useEffect(() => {
    // Start loading branches when the dialog opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void fetchNearestBranches();
  }, [open, fetchNearestBranches]);

  useEffect(() => {
    // Clear stale slots when a required selection is removed.
    if (!open || !preferredDate || !selectedBranch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeSlots([]);
      setPreferredTime("");
      return;
    }

    let current = true;
    setLoadingTimeSlots(true);
    setTimeSlotsError("");
    API.get("/consultations/availability", { params: { date: preferredDate, branch: selectedBranch } })
      .then((response) => {
        if (!current) return;
        const slots = response.data.data?.slots || [];
        setTimeSlots(slots);
        setPreferredTime((selected) => slots.some((slot: ConsultationTimeSlot) => slot.key === selected && slot.available)
          ? selected
          : slots.find((slot: ConsultationTimeSlot) => slot.available)?.key || "");
      })
      .catch((requestError: AxiosError<{ message?: string }>) => {
        if (!current) return;
        setTimeSlots([]);
        setPreferredTime("");
        setTimeSlotsError(requestError.response?.data?.message || "Could not check consultation times. Please try again.");
      })
      .finally(() => { if (current) setLoadingTimeSlots(false); });
    return () => { current = false; };
  }, [open, preferredDate, selectedBranch, slotRefresh]);
  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setValidationErrors({});

    // Custom validation
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Please enter your name";
    if (!phone.trim()) errors.phone = "Please enter your phone number";
    if (!email.trim()) errors.email = "Please enter your email address";
    if (!preferredDate) errors.preferredDate = "Please select a consultation date";
    if (!preferredTime) errors.preferredTime = "Please choose an available consultation time";
    if (!selectedBranch) errors.branch = "Please select a boutique location";

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await API.post("/consultations", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        preferredDate,
        timeSlotKey: preferredTime,
        consultationType,
        garmentInterest,
        notes: notes.trim(),
        branch: selectedBranch,
      });
      setSubmitted(true);
    } catch (err) {
      const requestError = err as AxiosError<{ message?: string }>;
      if (requestError.response?.status === 409) setSlotRefresh((refresh) => refresh + 1);
      setError(
        requestError.response?.data?.message ||
          "We couldn't send your consultation request. Please try again."
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
      setBranches([]);
      setSelectedBranch(null);
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
            Tell us a little about what you have in mind. We&apos;ll contact you to confirm a time with our atelier.
          </p>
        </div>

        {submitted ? (
          <div className="px-6 py-12 text-center sm:px-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="mt-5 font-serif text-2xl text-stone-900">Your request is with our atelier</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">
              We&apos;ll reach out using the contact details you provided to confirm your consultation date and time.
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
            {/* Branch Selection */}
            <div>
              <label className="mb-3 block text-sm font-medium text-stone-700">Select your preferred boutique</label>
              {loadingBranches ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-[#e5dac8] bg-white py-6 text-sm text-stone-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  Finding nearest boutiques...
                </div>
              ) : branchError ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  {branchError}
                </div>
              ) : branches.length > 0 ? (
                <div className="space-y-2">
                  {branches.map((branch) => (
                    <label
                      key={branch._id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5dac8] p-4 transition hover:border-orange-400 hover:bg-orange-50"
                    >
                      <input
                        type="radio"
                        name="branch"
                        value={branch._id}
                        checked={selectedBranch === branch._id}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900">{branch.name}</p>
                        <div className="flex items-start gap-1 text-xs text-stone-600 mt-1">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span>{branch.address.street}, {branch.address.city}</span>
                        </div>
                        {branch.distanceKm && (
                          <p className="text-xs text-orange-600 font-medium mt-1">
                            {branch.distanceKm} km away
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm text-stone-600">
                  No boutiques available at this time.
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="consultation-name" className="mb-1.5 block text-sm font-medium text-stone-700">Your name</label>
                <input
                  id="consultation-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 ${
                    validationErrors.name ? "border-red-400" : "border-[#e5dac8]"
                  }`}
                  placeholder="Full name"
                />
                {validationErrors.name && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span className="inline-block h-4 w-4 rounded-full bg-red-100 text-center leading-4 text-[10px]">!</span>
                    {validationErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="consultation-phone" className="mb-1.5 block text-sm font-medium text-stone-700">Phone number</label>
                <input
                  id="consultation-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 ${
                    validationErrors.phone ? "border-red-400" : "border-[#e5dac8]"
                  }`}
                  placeholder="+91 98765 43210"
                />
                {validationErrors.phone && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span className="inline-block h-4 w-4 rounded-full bg-red-100 text-center leading-4 text-[10px]">!</span>
                    {validationErrors.phone}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="consultation-email" className="mb-1.5 block text-sm font-medium text-stone-700">Email address</label>
                <input
                  id="consultation-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 ${
                    validationErrors.email ? "border-red-400" : "border-[#e5dac8]"
                  }`}
                  placeholder="you@example.com"
                />
                {validationErrors.email && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span className="inline-block h-4 w-4 rounded-full bg-red-100 text-center leading-4 text-[10px]">!</span>
                    {validationErrors.email}
                  </p>
                )}
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
                    min={localDateString()}
                    value={preferredDate}
                    onChange={(event) => setPreferredDate(event.target.value)}
                    className={`w-full rounded-xl border bg-white py-3 pl-10 pr-3 text-sm text-stone-800 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 ${
                      validationErrors.preferredDate ? "border-red-400" : "border-[#e5dac8]"
                    }`}
                  />
                </div>
                {validationErrors.preferredDate && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <span className="inline-block h-4 w-4 rounded-full bg-red-100 text-center leading-4 text-[10px]">!</span>
                    {validationErrors.preferredDate}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="consultation-time" className="mb-1.5 block text-sm font-medium text-stone-700">Preferred time</label>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <select
                    id="consultation-time"
                    value={preferredTime}
                    onChange={(event) => setPreferredTime(event.target.value)}
                    disabled={loadingTimeSlots || !preferredDate || !selectedBranch || !timeSlots.some((slot) => slot.available)}
                    className="w-full appearance-none rounded-xl border border-[#e5dac8] bg-white py-3 pl-10 pr-9 text-sm text-stone-800 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
                  >
                    <option value="">{loadingTimeSlots ? "Checking availability…" : !preferredDate || !selectedBranch ? "Choose a date and atelier first" : timeSlotsError ? "Times unavailable" : timeSlots.some((slot) => slot.available) ? "Choose a time" : "No times available"}</option>
                    {timeSlots.map((slot) => <option key={slot.key} value={slot.key} disabled={!slot.available}>{slot.label}{slot.available ? "" : " · Booked"}</option>)}
                  </select>
                  {timeSlotsError ? <p role="alert" className="mt-1.5 text-xs text-red-600">{timeSlotsError}</p> : !loadingTimeSlots && preferredDate && selectedBranch && timeSlots.length > 0 && !timeSlots.some((slot) => slot.available) ? <p className="mt-1.5 text-xs text-stone-500">All consultation times are booked for this date. Please choose another date or atelier.</p> : <p className="mt-1.5 text-xs text-stone-500">One-hour appointments are available 9am–1pm and 2pm–8pm. The atelier is closed for lunch from 1pm to 2pm.</p>}
                  {validationErrors.preferredTime && <p className="mt-1.5 text-xs text-red-600">{validationErrors.preferredTime}</p>}
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
              <label htmlFor="consultation-notes" className="mb-1.5 block text-sm font-medium text-stone-700">Anything you&apos;d like us to know? <span className="font-normal text-stone-400">(optional)</span></label>
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
                disabled={loading || loadingTimeSlots || !selectedBranch || !preferredTime}
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
