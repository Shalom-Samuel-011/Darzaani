"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Ruler, ShoppingBag } from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import ConsultationDialog from "@/components/ConsultationDialog";
import type { Garment, StandardSize } from "@/types";

const defaultSizes: StandardSize[] = ["XS", "S", "M", "L", "XL", "XXL"];

// Approximate body measurements for a general fit guide; product fit can vary.
const bodySizeGuide: Record<StandardSize, { bust: [number, number]; waist: [number, number]; hip: [number, number] } | null> = {
  XS: { bust: [32, 81], waist: [26, 66], hip: [35, 89] },
  S: { bust: [34, 86], waist: [28, 71], hip: [37, 94] },
  M: { bust: [36, 91], waist: [30, 76], hip: [39, 99] },
  L: { bust: [38, 97], waist: [32, 81], hip: [41, 104] },
  XL: { bust: [40, 102], waist: [34, 86], hip: [43, 109] },
  XXL: { bust: [42, 107], waist: [36, 91], hip: [45, 114] },
  "Free Size": null,
};

const defaultColorsByCategory: Record<string, string[]> = {
  "Sarees & Blouses": ["Rose gold", "Ruby", "Emerald", "Ivory", "Champagne"],
  "Kurtis & Sets": ["Indigo", "Ivory", "Sage", "Blush", "Sky blue"],
  Lehengas: ["Rose gold", "Ruby", "Sage", "Peach", "Champagne"],
};

const colorHex: Record<string, string> = {
  "Rose gold": "#b77d71",
  Ruby: "#80263b",
  Emerald: "#315d4b",
  Ivory: "#eee5d4",
  Champagne: "#d8c4a2",
  Indigo: "#384b79",
  Sage: "#9da68a",
  Blush: "#d6a3a1",
  "Sky blue": "#9db8ce",
  Peach: "#e7ad94",
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductDetails({ garmentId }: { garmentId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const { addItem } = useCart();
  const [garment, setGarment] = useState<Garment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSize, setSelectedSize] = useState<StandardSize | "custom" | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [sizeGuideUnit, setSizeGuideUnit] = useState<"inches" | "cm">("inches");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedMeasurementProfileId, setSelectedMeasurementProfileId] = useState<string | null>(null);
  const [addedToBag, setAddedToBag] = useState(false);
  const [addingToBag, setAddingToBag] = useState(false);
  const [bagError, setBagError] = useState("");
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    API.get(`/garments/${garmentId}`)
      .then((response) => {
        if (isCurrent) setGarment(response.data.data.garment);
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        if (isCurrent) {
          setError(err.response?.data?.message || "We couldn’t find this piece.");
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [garmentId]);

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid animate-pulse gap-10 lg:grid-cols-2">
          <div className="aspect-[4/5] rounded-[2rem] bg-[#e9dfcf]" />
          <div className="space-y-5 py-8">
            <div className="h-4 w-32 rounded bg-[#e9dfcf]" />
            <div className="h-12 w-3/4 rounded bg-[#e9dfcf]" />
            <div className="h-24 rounded bg-[#eee6d9]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !garment) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
        <p className="font-serif text-3xl text-stone-800">This piece isn’t available</p>
        <p className="mt-3 text-sm text-stone-600">{error || "Return to the collection to find another piece."}</p>
        <Link href="/catalog" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-orange-800">
          <ArrowLeft className="h-4 w-4" />
          Back to the collection
        </Link>
      </div>
    );
  }

  const sizes = garment.availableStandardSizes?.length
    ? garment.availableStandardSizes
    : defaultSizes;
  const canChooseStandard = garment.sizingType !== "custom_only";
  const colors = garment.availableColors?.length
    ? garment.availableColors
    : defaultColorsByCategory[garment.category] || ["Ivory", "Rose gold", "Sage"];
  const image = garment.images?.[0] || "/images/saree-card.webp";
  const isCustomFit = selectedSize === "custom";
  const selectedMeasurementProfile = user?.measurements.find(
    (profile) => profile._id === selectedMeasurementProfileId,
  );
  const canAddToBag = Boolean(
    selectedSize &&
      selectedColor &&
      garment.isAvailable &&
      (!isCustomFit || selectedMeasurementProfile),
  );
  const returnPath = `/catalog/${garment._id}`;
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath)}`;
  const signupHref = `/signup?redirect=${encodeURIComponent(returnPath)}`;

  const addToBag = async () => {
    if (!canAddToBag || !selectedColor || !selectedSize) return;

    setAddingToBag(true);
    setBagError("");
    try {
      await addItem({
        garment,
        sizingTypeUsed: isCustomFit ? "custom" : "standard",
        selectedStandardSize: selectedSize === "custom" ? undefined : selectedSize,
        selectedMeasurementProfileId: isCustomFit
          ? selectedMeasurementProfile?._id
          : undefined,
        selectedMeasurementProfileTitle: isCustomFit
          ? selectedMeasurementProfile?.profileTitle
          : undefined,
        selectedColor,
      });
      setAddedToBag(true);
    } catch (err) {
      setBagError(err instanceof Error ? err.message : "Could not add this piece to your fitting bag.");
    } finally {
      setAddingToBag(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-24 text-stone-900">
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 sm:pt-10">
        <Link href="/catalog" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-orange-800">
          <ArrowLeft className="h-4 w-4" />
          Back to the collection
        </Link>

        <div className="mt-7 grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-cream-200 shadow-[0_20px_55px_rgba(64,43,22,0.12)]">
            <Image
              src={image}
              alt={garment.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-stone-950/35 to-transparent" />
            <span className="absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/60 bg-[#fffaf0]/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#713b24] backdrop-blur-sm">
              <Clock3 className="h-3.5 w-3.5" />
              Made in about {garment.estimatedDays} days
            </span>
          </div>

          <div className="py-2 lg:py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.23em] text-orange-800">
              {garment.category}
            </p>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <h1 className="max-w-xl font-serif text-4xl font-medium leading-tight text-stone-900 sm:text-5xl">
                {garment.name}
              </h1>
              <p className="pt-2 text-xl font-semibold text-orange-800">
                {formatPrice(garment.basePrice)}
              </p>
            </div>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">
              {garment.description}
            </p>

            <div className="mt-8 border-t border-[#e6dccb] pt-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-stone-800">
                  {garment.category === "Sarees & Blouses" ? "Choose blouse sizing" : "Choose your size"}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-500">Standard or made-to-measure</span>
                  {canChooseStandard && (
                    <button
                      type="button"
                      aria-expanded={showSizeGuide}
                      aria-controls="standard-size-guide"
                      onClick={() => setShowSizeGuide((shown) => !shown)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-orange-800 underline decoration-orange-300 underline-offset-4 hover:text-orange-900"
                    >
                      {showSizeGuide ? "Hide size guide" : "Size guide"}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSizeGuide ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {canChooseStandard && sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setSelectedSize(size);
                      setSelectedMeasurementProfileId(null);
                      setAddedToBag(false);
                    }}
                    aria-pressed={selectedSize === size}
                    className={`min-w-12 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                      selectedSize === size
                        ? "border-[#853b20] bg-[#853b20] text-white"
                        : "border-[#ded2bf] bg-[#fffdf8]/80 text-stone-700 hover:border-orange-600"
                    }`}
                  >
                    {size}
                  </button>
                ))}
                {garment.sizingType !== "standard_only" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSize("custom");
                      setSelectedMeasurementProfileId(null);
                      setAddedToBag(false);
                    }}
                    aria-pressed={isCustomFit}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                      isCustomFit
                        ? "border-[#853b20] bg-[#853b20] text-white"
                        : "border-[#ded2bf] bg-[#f6f0e5] text-[#783c22] hover:border-orange-600"
                    }`}
                  >
                    <Ruler className="h-4 w-4" />
                    Custom fit
                  </button>
                )}
              </div>
              {showSizeGuide && canChooseStandard && (
                <div id="standard-size-guide" className="mt-5 rounded-2xl border border-[#e7ddcc] bg-[#fffdf8] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">Standard body measurements</h3>
                      <p className="mt-1 text-xs text-stone-500">Approximate body measurements, not garment dimensions.</p>
                    </div>
                    <div className="inline-flex rounded-full border border-[#e3d8c6] bg-white p-1" aria-label="Measurement units">
                      {(["inches", "cm"] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setSizeGuideUnit(unit)}
                          aria-pressed={sizeGuideUnit === unit}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                            sizeGuideUnit === unit
                              ? "bg-[#873b20] text-white"
                              : "text-stone-600 hover:text-orange-800"
                          }`}
                        >
                          {unit === "inches" ? "Inches" : "cm"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[390px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#e7ddcc] text-[10px] uppercase tracking-[0.12em] text-stone-500">
                          <th scope="col" className="px-2 py-2.5 font-semibold">Size</th>
                          <th scope="col" className="px-2 py-2.5 font-semibold">Bust</th>
                          <th scope="col" className="px-2 py-2.5 font-semibold">Waist</th>
                          <th scope="col" className="px-2 py-2.5 font-semibold">Hip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizes.map((size) => {
                          const measurements = bodySizeGuide[size];
                          const unitIndex = sizeGuideUnit === "inches" ? 0 : 1;
                          const unitLabel = sizeGuideUnit === "inches" ? "in" : "cm";
                          return (
                            <tr key={size} className="border-b border-[#f0e8dc] last:border-0">
                              <th scope="row" className="px-2 py-2.5 font-semibold text-stone-800">{size}</th>
                              <td className="px-2 py-2.5 text-stone-600">
                                {measurements ? `${measurements.bust[unitIndex]} ${unitLabel}` : "One size"}
                              </td>
                              <td className="px-2 py-2.5 text-stone-600">
                                {measurements ? `${measurements.waist[unitIndex]} ${unitLabel}` : "—"}
                              </td>
                              <td className="px-2 py-2.5 text-stone-600">
                                {measurements ? `${measurements.hip[unitIndex]} ${unitLabel}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 rounded-xl bg-[#f7f1e7] px-3.5 py-3 text-xs leading-5 text-stone-600">
                    <p>
                      {garment.category === "Sarees & Blouses"
                        ? "For a blouse, compare your bust first, then your waist."
                        : garment.category === "Lehengas"
                          ? "For a lehenga, compare your waist and hip measurements first."
                          : "For a kurta set, compare your bust, waist, and hip measurements."}
                      {" "}If you fall between sizes, choose the larger size for comfort or select custom fit.
                    </p>
                    <p className="mt-1.5">
                      Measure bust at its fullest point, waist at your natural waist, and hips at the fullest point. Keep a soft tape level and comfortably snug. Sizing varies by style and fabric; book a consultation if you’re unsure.
                    </p>
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs leading-5 text-stone-500" aria-live="polite">
                {isCustomFit
                  ? "Choose a saved measurement profile, or book a consultation and we’ll help you get measured."
                  : garment.category === "Sarees & Blouses"
                    ? "Choose a standard blouse size, or select custom fit for a blouse made to your measurements."
                    : "Choose your usual size, or select custom fit for a garment made to your measurements."}
              </p>
              {isCustomFit && (
                <div className="mt-5 rounded-2xl border border-[#e7ddcc] bg-[#fffdf8]/85 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">
                        Your measurement profile
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        Select the saved measurements to use for this piece.
                      </p>
                    </div>
                    {user && (
                      <Link
                        href="/measurements"
                        className="text-xs font-semibold text-orange-800 underline underline-offset-2 hover:text-orange-900"
                      >
                        Manage profiles
                      </Link>
                    )}
                  </div>

                  {authLoading ? (
                    <p className="mt-4 text-sm text-stone-500">Loading your saved profiles…</p>
                  ) : user?.measurements.length ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {user.measurements.map((profile, index) => (
                        <button
                          key={profile._id || `${profile.profileTitle}-${index}`}
                          type="button"
                          disabled={!profile._id}
                          onClick={() => {
                            if (!profile._id) return;
                            setSelectedMeasurementProfileId(profile._id);
                            setAddedToBag(false);
                          }}
                          aria-pressed={selectedMeasurementProfileId === profile._id}
                          className={`rounded-xl border px-3.5 py-3 text-left transition ${
                            selectedMeasurementProfileId === profile._id
                              ? "border-[#873b20] bg-[#f5eadc] ring-1 ring-[#873b20]"
                              : "border-[#e7ddcc] bg-white hover:border-orange-500"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="block text-sm font-semibold text-stone-800">
                            {profile.profileTitle}
                          </span>
                          <span className="mt-1 block text-[11px] uppercase tracking-wide text-stone-500">
                            Measurements in {profile.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-[#f7f1e7] px-3.5 py-3 text-xs leading-5 text-stone-600">
                      {user
                        ? "You don’t have a saved profile yet. Add your measurements yourself or book a consultation with our atelier."
                        : "Sign in to choose a saved profile, or book a consultation and our atelier will help with your measurements."}
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {!user && !authLoading && (
                      <Link
                        href={loginHref}
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-[#ded2bf] bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 transition hover:border-orange-500 hover:text-orange-800"
                      >
                        Sign in to your profiles
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsConsultationOpen(true)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#873b20] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-800"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Book a consultation
                    </button>
                  </div>
                  {selectedMeasurementProfile && (
                    <p className="mt-3 text-xs font-medium text-emerald-800" role="status">
                      {selectedMeasurementProfile.profileTitle} selected for this custom fit.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-7 border-t border-[#e6dccb] pt-7">
              <h2 className="text-sm font-semibold text-stone-800">Choose a colour</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color);
                      setAddedToBag(false);
                    }}
                    aria-label={`Choose ${color}`}
                    aria-pressed={selectedColor === color}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
                      selectedColor === color
                        ? "border-[#853b20] bg-white text-stone-900 ring-1 ring-[#853b20]"
                        : "border-[#ded2bf] bg-[#fffdf8]/70 text-stone-700 hover:border-orange-600"
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ backgroundColor: colorHex[color] || "#c9b59a" }}
                    />
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              {!authLoading && !user ? (
                <div className="space-y-3">
                  <Link
                    href={loginHref}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#853b20] px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-orange-800"
                  >
                    Sign in to add this piece to your fitting bag
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <p className="text-center text-xs text-stone-500">
                    New to Darzaani?{" "}
                    <Link href={signupHref} className="font-semibold text-orange-800 underline underline-offset-2">
                      Create an account
                    </Link>
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addToBag}
                  disabled={authLoading || addingToBag || !canAddToBag}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#853b20] px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authLoading ? "Checking your account…" : addingToBag ? "Adding to your bag…" : "Add to my fitting bag"}
                  {!authLoading && <ShoppingBag className="h-4 w-4" />}
                </button>
              )}

              {addedToBag && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Added to your fitting bag.
                  </span>
                  <Link href="/cart" className="font-semibold underline underline-offset-2">
                    View bag
                  </Link>
                </div>
              )}
              {bagError && <p className="mt-3 text-center text-sm text-red-700" role="alert">{bagError}</p>}
              {!canAddToBag && !addedToBag && (
                <p className="mt-3 text-center text-xs text-stone-500">
                  {!selectedSize || !selectedColor
                    ? "Choose a size and colour to continue."
                    : isCustomFit && !selectedMeasurementProfile
                      ? "Choose a saved measurement profile to add this custom-fit piece."
                      : "This piece is currently unavailable."}
                </p>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#e6dccb] pt-6 text-xs text-stone-600">
              {garment.attributes?.Fabric && (
                <div>
                  <p className="font-semibold uppercase tracking-[0.14em] text-stone-500">Fabric</p>
                  <p className="mt-1.5 text-sm text-stone-800">{garment.attributes.Fabric}</p>
                </div>
              )}
              <div>
                <p className="font-semibold uppercase tracking-[0.14em] text-stone-500">Crafted for you</p>
                <p className="mt-1.5 text-sm text-stone-800">Finished by hand in our atelier</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConsultationDialog
        open={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        initialGarmentInterest={
          garment.category === "Sarees & Blouses"
            ? "Sarees & blouses"
            : garment.category === "Kurtis & Sets"
              ? "Kurtis & sets"
              : garment.category === "Lehengas"
                ? "Lehengas"
                : "Something else"
        }
      />
    </div>
  );
}
