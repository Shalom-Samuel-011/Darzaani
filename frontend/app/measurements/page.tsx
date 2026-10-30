"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { Check, ChevronDown, Trash2, X } from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { MeasurementProfile } from "@/types";

export default function MeasurementsPage() {
  const { user, login, token } = useAuth();
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isConfirmDeleting, setIsConfirmDeleting] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const [profileTitle, setProfileTitle] = useState("");
  const [unit, setUnit] = useState<"inches" | "cm">("inches");
  const [shoulders, setShoulders] = useState<string>("");
  const [chest, setChest] = useState<string>("");
  const [waistUpper, setWaistUpper] = useState<string>("");
  const [hip, setHip] = useState<string>("");
  const [sleeveLength, setSleeveLength] = useState<string>("");
  const [fullLength, setFullLength] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Keep editable profile state synchronized with the auth context.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfiles(user?.measurements || []);
  }, [user?.measurements]);

  const handleCreateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const newProfile = {
      profileTitle,
      unit,
      shoulders: shoulders ? Number(shoulders) : undefined,
      chest: chest ? Number(chest) : undefined,
      waistUpper: waistUpper ? Number(waistUpper) : undefined,
      hip: hip ? Number(hip) : undefined,
      sleeveLength: sleeveLength ? Number(sleeveLength) : undefined,
      fullLength: fullLength ? Number(fullLength) : undefined,
      notes,
    };

    try {
      const res = await API.post("/users/me/measurements", newProfile);
      const updatedMeasurements: MeasurementProfile[] =
        res.data.data.measurements;
      const updatedUser = user ? { ...user, measurements: updatedMeasurements } : null;
      if (token && updatedUser) login(token, updatedUser);
      setProfiles(updatedMeasurements);
      setSuccessMsg("Measurement profile saved successfully!");
      setIsCreating(false);
      resetForm();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(
        error.response?.data?.message || "Failed to save measurement profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProfileTitle("");
    setShoulders("");
    setChest("");
    setWaistUpper("");
    setHip("");
    setSleeveLength("");
    setFullLength("");
    setNotes("");
    setUnit("inches");
  };

  const handleDeleteProfile = (id: string) => {
    setIsConfirmDeleting(true);
    setDeletingProfileId(id);
  };

  const confirmDeleteProfile = async () => {
    if (!deletingProfileId) return;
    setError("");
    setLoading(true);
    try {
      await API.delete(`/users/me/measurements/${deletingProfileId}`);
      const updatedMeasurements = profiles.filter(
        (profile) => profile._id !== deletingProfileId,
      );
      setProfiles(updatedMeasurements);
      if (token && user) {
        login(token, { ...user, measurements: updatedMeasurements });
      }
      setSuccessMsg("Profile deleted successfully!");
      setIsConfirmDeleting(false);
      setDeletingProfileId(null);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Failed to delete profile.");
    } finally {
      setLoading(false);
      setIsConfirmDeleting(false);
      setDeletingProfileId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Measurement Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Save custom size profiles for quick, precise orders.
          </p>
        </div>
        <button
          onClick={() => {
            if (isCreating) resetForm();
            setIsCreating((creating) => !creating);
          }}
          className="self-start sm:self-auto text-xs font-semibold bg-orange-600 text-white px-4 py-2.5 rounded-lg hover:bg-orange-700 transition"
        >
          {isCreating ? "Cancel" : "+ Add New Profile"}
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-orange-50 p-3 text-sm text-orange-600 border border-orange-200">
          {error}
        </div>
      )}

      {/* Create Profile Form */}
      {isCreating && (
        <div className="bg-white rounded-3xl border border-cream-200 shadow-xl shadow-orange-900/5 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Create New Profile
          </h2>

          <form onSubmit={handleCreateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Title
                </label>
                <input
                  type="text"
                  required
                  value={profileTitle}
                  onChange={(e) => setProfileTitle(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 placeholder:text-gray-400"
                  placeholder="e.g. Kurta Fitting / Sherwani Profile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Measurement Unit
                </label>
                <div
                  className="relative"
                  onBlur={(event) => {
                    const nextTarget = event.relatedTarget as Node | null;
                    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                      setIsUnitMenuOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isUnitMenuOpen}
                    aria-label="Measurement unit"
                    onClick={() => setIsUnitMenuOpen((open) => !open)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setIsUnitMenuOpen(true);
                      }
                      if (event.key === "Escape") setIsUnitMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border bg-cream-50 px-4 py-2.5 text-left text-sm text-stone-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 ${
                      isUnitMenuOpen
                        ? "border-orange-500 bg-white ring-2 ring-orange-500/20"
                        : "border-cream-200"
                    }`}
                  >
                    <span>{unit === "inches" ? "Inches (in)" : "Centimeters (cm)"}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-stone-500 transition-transform ${
                        isUnitMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isUnitMenuOpen && (
                    <div
                      role="listbox"
                      aria-label="Measurement unit options"
                      className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-[#e7ddcc] bg-[#fffdf8] p-1.5 shadow-[0_14px_35px_rgba(72,51,27,0.16)]"
                    >
                      {[
                        { value: "inches", label: "Inches (in)" },
                        { value: "cm", label: "Centimeters (cm)" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={unit === option.value}
                          onClick={() => {
                            setUnit(option.value as "inches" | "cm");
                            setIsUnitMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            unit === option.value
                              ? "bg-[#f3e9d8] font-semibold text-[#873b20]"
                              : "text-stone-700 hover:bg-[#f8f1e6] hover:text-[#873b20]"
                          }`}
                        >
                          <span>{option.label}</span>
                          {unit === option.value && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Shoulders ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={shoulders}
                  onChange={(e) => setShoulders(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                  placeholder="17.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Chest / Bust ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                  placeholder="38.0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Waist ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={waistUpper}
                  onChange={(e) => setWaistUpper(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                  placeholder="32.0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hips ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={hip}
                  onChange={(e) => setHip(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                  placeholder="40.0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Sleeve Length ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sleeveLength}
                  onChange={(e) => setSleeveLength(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                  placeholder="24.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Full Length ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={fullLength}
                  onChange={(e) => setFullLength(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                  placeholder="42.0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fitting Notes / Preferences
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 placeholder:text-gray-400"
                placeholder="Slim fit preference, relaxed shoulders, extra ease, etc."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              {loading ? "Saving Profile..." : "Save Measurement Profile"}
            </button>
          </form>
        </div>
      )}

      {/* Saved Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-cream-200 p-8">
          <p className="text-gray-500 font-medium mb-4">
            No saved measurement profiles yet.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="text-xs font-semibold bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
          >
            Create Your First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profiles.map((profile, idx) => (
            <div
              key={profile._id || idx}
              className="bg-white rounded-3xl border border-cream-200 shadow-sm p-6"
            >
              <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-cream-200">
                <h3 className="font-bold text-gray-900 text-lg">
                  {profile.profileTitle}
                </h3>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs uppercase font-semibold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-md">
                    {profile.unit}
                  </span>
                  {profile._id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(profile._id!)}
                      className="rounded-full p-2 text-stone-500 transition hover:bg-orange-50 hover:text-orange-700"
                      aria-label={`Delete ${profile.profileTitle}`}
                      title="Delete profile"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                {profile.shoulders && (
                  <div className="bg-cream-100 rounded-lg p-2">
                    <span className="text-gray-400 block">
                      Shoulders
                    </span>
                    <span className="font-semibold text-gray-800">
                      {profile.shoulders} {profile.unit}
                    </span>
                  </div>
                )}
                {profile.chest && (
                  <div className="bg-cream-100 rounded-lg p-2">
                    <span className="text-gray-400 block">
                      Chest/Bust
                    </span>
                    <span className="font-semibold text-gray-800">
                      {profile.chest} {profile.unit}
                    </span>
                  </div>
                )}
                {profile.waistUpper && (
                  <div className="bg-cream-100 rounded-lg p-2">
                    <span className="text-gray-400 block">
                      Waist
                    </span>
                    <span className="font-semibold text-gray-800">
                      {profile.waistUpper} {profile.unit}
                    </span>
                  </div>
                )}
                {profile.hip && (
                  <div className="bg-cream-100 rounded-lg p-2">
                    <span className="text-gray-400 block">
                      Hips
                    </span>
                    <span className="font-semibold text-gray-800">
                      {profile.hip} {profile.unit}
                    </span>
                  </div>
                )}
                {profile.sleeveLength && (
                  <div className="bg-cream-100 rounded-lg p-2">
                    <span className="text-gray-400 block">
                      Sleeve
                    </span>
                    <span className="font-semibold text-gray-800">
                      {profile.sleeveLength} {profile.unit}
                    </span>
                  </div>
                )}
                {profile.fullLength && (
                  <div className="bg-cream-100 rounded-lg p-2">
                    <span className="text-gray-400 block">
                      Full Length
                    </span>
                    <span className="font-semibold text-gray-800">
                      {profile.fullLength} {profile.unit}
                    </span>
                  </div>
                )}
              </div>

              {profile.notes && (
                <p className="text-xs text-gray-500 italic bg-orange-50/60 p-2.5 rounded-lg border border-orange-100">
                  &quot;{profile.notes}&quot;
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {isConfirmDeleting && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsConfirmDeleting(false);
              setDeletingProfileId(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-profile-title"
            className="w-full max-w-md rounded-3xl border border-[#e7ddcc] bg-[#fffdf8] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="delete-profile-title"
                  className="text-lg font-semibold text-stone-900"
                >
                  Delete measurement profile?
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {`“${profiles.find((profile) => profile._id === deletingProfileId)?.profileTitle || "This profile"}” will be removed from your saved measurements.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmDeleting(false);
                  setDeletingProfileId(null);
                }}
                className="rounded-full p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                aria-label="Close confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmDeleting(false);
                  setDeletingProfileId(null);
                }}
                disabled={loading}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
              >
                Keep profile
              </button>
              <button
                type="button"
                onClick={confirmDeleteProfile}
                disabled={loading}
                className="rounded-full bg-[#873b20] px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:opacity-50"
              >
                {loading ? "Deleting…" : "Delete profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
