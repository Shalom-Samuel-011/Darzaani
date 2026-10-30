"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import { ArrowRight, Clock3, Plus, Ruler, Search, X } from "lucide-react";
import API from "@/lib/api";
import type { Garment } from "@/types";
import { useAuth } from "@/context/AuthContext";

const categories = [
  "All pieces",
  "Sarees & Blouses",
  "Kurtis & Sets",
  "Lehengas",
] as const;

const garmentCategories = [
  "Lehengas",
  "Sarees & Blouses",
  "Kurtis & Sets",
] as const;

const PAGE_SIZE = 10;

interface SelectedImage {
  file: File;
  preview: string;
}

interface BranchAvailability { isAvailable: boolean; globallyAvailable: boolean }

function ProductCard({
  garment,
  branchAvailability,
  isBranchManager,
  isSavingAvailability,
  onToggleAvailability,
}: {
  garment: Garment;
  branchAvailability?: BranchAvailability;
  isBranchManager: boolean;
  isSavingAvailability: boolean;
  onToggleAvailability: () => void;
}) {
  const image = garment.images?.[0] || "/images/saree-card.webp";

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-[#e7ddcc] bg-[#fffdf8] shadow-[0_8px_30px_rgba(72,51,27,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(72,51,27,0.1)]">
      <Link href={`/catalog/${garment._id}`} className="group block">
        <div className="relative aspect-[4/4.5] overflow-hidden bg-cream-200">
        <Image
          src={image}
          alt={garment.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950/35 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-white/60 bg-[#fffaf0]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713b24] backdrop-blur-sm">
          {garment.category}
        </span>
        <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 text-xs font-medium text-white drop-shadow">
          <Clock3 className="h-3.5 w-3.5" />
          {garment.estimatedDays} days
        </span>
        </div>

        <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold leading-snug text-stone-900 sm:text-[22px]">
            {garment.name}
          </h2>
          <p className="shrink-0 pt-1 text-sm font-semibold text-orange-800">
            ₹{garment.basePrice.toLocaleString("en-IN")}
          </p>
        </div>
        <p className="mt-2 min-h-[3rem] text-sm leading-6 text-stone-600">
          {garment.description}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-[#eee5d7] pt-4 text-xs font-medium text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-orange-700" />
            Standard or custom fit
          </span>
          <span className="inline-flex items-center gap-1.5 text-orange-800 transition-all group-hover:gap-2.5">
            View details
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
        </div>
      </Link>
      {isBranchManager && branchAvailability && <div className="flex items-center justify-between gap-3 border-t border-[#eee5d7] bg-[#fffaf1] px-5 py-3.5 sm:px-6">
        <span className={`text-xs font-medium ${branchAvailability.isAvailable ? "text-green-800" : "text-stone-600"}`}>
          {branchAvailability.globallyAvailable ? (branchAvailability.isAvailable ? "Available at your branch" : "Unavailable at your branch") : "Disabled in catalog"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={branchAvailability.isAvailable}
          aria-label={`${branchAvailability.isAvailable ? "Mark unavailable" : "Mark available"}: ${garment.name}`}
          disabled={!branchAvailability.globallyAvailable || isSavingAvailability}
          onClick={onToggleAvailability}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${branchAvailability.isAvailable ? "bg-green-700" : "bg-stone-300"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${branchAvailability.isAvailable ? "left-6" : "left-1"}`} />
        </button>
      </div>}
    </article>
  );
}

export default function CatalogPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isMasterAdmin = user?.role === "master-admin";
  const isBranchManager = user?.role === "branch-manager";
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All pieces");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [branchAvailability, setBranchAvailability] = useState<Record<string, BranchAvailability>>({});
  const [savingAvailabilityId, setSavingAvailabilityId] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [isAddDressOpen, setIsAddDressOpen] = useState(false);
  const [isSavingDress, setIsSavingDress] = useState(false);
  const [createDressError, setCreateDressError] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const imageObjectUrls = useRef(new Set<string>());

  useEffect(() => {
    if (user?.role === "tailor") router.replace("/tailor");
  }, [user, router]);

  useEffect(() => () => {
    imageObjectUrls.current.forEach((preview) => URL.revokeObjectURL(preview));
    imageObjectUrls.current.clear();
  }, []);

  const clearSelectedImages = () => {
    imageObjectUrls.current.forEach((preview) => URL.revokeObjectURL(preview));
    imageObjectUrls.current.clear();
    setSelectedImages([]);
  };

  const handleAddDress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    if (!newItemCategory) {
      setCreateDressError("Please select a category.");
      return;
    }
    if (selectedImages.some(({ file }) => file.size > 5 * 1024 * 1024)) {
      setCreateDressError("Each image must be 5 MB or smaller.");
      return;
    }

    setIsSavingDress(true);
    setCreateDressError("");

    try {
      const payload = new FormData();
      payload.append("name", String(formData.get("name") || "").trim());
      payload.append("category", newItemCategory);
      payload.append("description", String(formData.get("description") || "").trim());
      payload.append("basePrice", String(formData.get("basePrice") || ""));
      payload.append("estimatedDays", String(formData.get("estimatedDays") || "7"));
      selectedImages.forEach(({ file }) => payload.append("images", file));

      await API.post("/garments", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      formElement.reset();
      clearSelectedImages();
      setIsAddDressOpen(false);
      setNewItemCategory("");
      setIsCategoryMenuOpen(false);
      setSelectedCategory("All pieces");
      setSearch("");
      setCurrentPage(1);
      setRetry((count) => count + 1);
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setCreateDressError(
        apiError.response?.data?.message || "We couldn’t add this dress. Please try again.",
      );
    } finally {
      setIsSavingDress(false);
    }
  };

  const toggleBranchAvailability = async (garmentId: string) => {
    const currentAvailability = branchAvailability[garmentId];
    if (!currentAvailability) return;
    setSavingAvailabilityId(garmentId);
    setAvailabilityError("");
    try {
      const response = await API.patch(`/manager/inventory/${garmentId}/availability`, {
        isAvailable: !currentAvailability.isAvailable,
      });
      const updated = response.data.data.inventoryItem as BranchAvailability;
      setBranchAvailability((current) => ({ ...current, [garmentId]: updated }));
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setAvailabilityError(apiError.response?.data?.message || "Could not update branch availability. Please try again.");
    } finally {
      setSavingAvailabilityId("");
    }
  };

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    if (category && categories.includes(category as (typeof categories)[number])) {
      // Initialize from the URL after hydration so the server render stays stable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategory(category);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const fetchGarments = async () => {
      setLoading(true);
      setError("");
      try {
        const params: {
          limit: number;
          page: number;
          category?: string;
          search?: string;
        } = { limit: PAGE_SIZE, page: currentPage };
        if (selectedCategory !== "All pieces") params.category = selectedCategory;
        if (search.trim()) params.search = search.trim();

        const response = await API.get("/garments", { params });
        if (isCurrent) {
          const fetchedGarments = response.data.data.garments || [];
          setGarments(fetchedGarments);
          setTotalResults(response.data.totalResults ?? response.data.results ?? 0);
          setTotalPages(response.data.totalPages ?? 0);
          setAvailabilityError("");
          if (isBranchManager && fetchedGarments.length) {
            try {
              const inventoryResponse = await API.get("/manager/inventory", {
                params: { ids: fetchedGarments.map((garment: Garment) => garment._id).join(",") },
              });
              if (isCurrent) {
                const availability = (inventoryResponse.data.data.inventory || []) as (BranchAvailability & { _id: string })[];
                setBranchAvailability(Object.fromEntries(availability.map((item) => [item._id, {
                  isAvailable: item.isAvailable,
                  globallyAvailable: item.globallyAvailable,
                }])));
              }
            } catch {
              if (isCurrent) setAvailabilityError("Branch availability could not be loaded. Refresh the collection to try again.");
            }
          } else {
            setBranchAvailability({});
          }
        }
      } catch (err) {
        const apiError = err as AxiosError<{ message?: string }>;
        if (isCurrent) {
          setError(
            apiError.response?.data?.message ||
              "We couldn’t load the collection. Please check that the atelier is online and try again.",
          );
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchGarments();
    return () => {
      isCurrent = false;
    };
  }, [currentPage, retry, search, selectedCategory, isBranchManager]);

  if (user?.role === "tailor") return <div className="flex min-h-[60vh] items-center justify-center text-sm text-stone-500">Opening your assigned work...</div>;

  return (
    <div className="min-h-screen bg-transparent pb-24 text-stone-900">
      <section className="relative overflow-hidden border-b border-[#e7ddcc] bg-[#f7f1e6]/70 px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-orange-200/25 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <p className="mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-800">
            <span className="h-px w-8 bg-orange-600" />
            Considered pieces, made for you
          </p>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-medium leading-tight text-stone-900 sm:text-5xl lg:text-6xl">
                The collection
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
                Discover thoughtful Indian occasionwear and everyday favourites, each available in standard sizes or made to your measurements.
              </p>
            </div>
            <label className="flex w-full items-center gap-3 rounded-full border border-[#ded2bf] bg-white/75 px-5 py-3 text-stone-500 shadow-sm lg:max-w-sm">
              <Search className="h-4 w-4 shrink-0" />
              <span className="sr-only">Search the collection</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search styles or fabrics"
                className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-9 sm:px-8 sm:pt-12">
        {availabilityError && isBranchManager && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{availabilityError}</p>}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }}
                aria-pressed={selectedCategory === category}
                className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
                  selectedCategory === category
                    ? "border-[#853b20] bg-[#853b20] text-white shadow-sm"
                    : "border-[#e0d5c2] bg-[#fffdf8]/75 text-stone-700 hover:border-orange-500 hover:text-orange-800"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4">
            {!loading && !error && (
              <p className="text-xs text-stone-500">
                {totalResults} {totalResults === 1 ? "piece" : "pieces"}
              </p>
            )}
            {isMasterAdmin && (
              <button
                type="button"
                onClick={() => {
                  setCreateDressError("");
                  setNewItemCategory("");
                  setIsCategoryMenuOpen(false);
                  clearSelectedImages();
                  setIsAddDressOpen(true);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#853b20] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-800 sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                Add new
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(PAGE_SIZE)].map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[1.6rem] border border-[#e7ddcc] bg-[#fffdf8] p-3">
                <div className="aspect-[4/4.5] animate-pulse rounded-[1.2rem] bg-[#eee5d6]" />
                <div className="space-y-3 p-3 pt-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-[#eee5d6]" />
                  <div className="h-4 w-full animate-pulse rounded bg-[#f2ebdf]" />
                  <div className="h-8 w-3/4 animate-pulse rounded-full bg-[#f2ebdf]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[#ead9c4] bg-[#fffdf8]/85 px-6 py-14 text-center">
            <p className="mx-auto max-w-lg text-sm leading-6 text-stone-600">{error}</p>
            <button
              type="button"
              onClick={() => setRetry((count) => count + 1)}
              className="mt-5 rounded-full bg-[#853b20] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-800"
            >
              Try again
            </button>
          </div>
        ) : garments.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {garments.map((garment) => (
              <ProductCard key={garment._id} garment={garment} isBranchManager={isBranchManager} branchAvailability={branchAvailability[garment._id]} isSavingAvailability={savingAvailabilityId === garment._id} onToggleAvailability={() => void toggleBranchAvailability(garment._id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#e7ddcc] bg-[#fffdf8]/80 px-6 py-16 text-center">
            <h2 className="font-serif text-2xl text-stone-800">No pieces found</h2>
            <p className="mt-2 text-sm text-stone-500">Try another category or search term.</p>
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <nav
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            aria-label="Catalog pagination"
          >
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage <= 1}
              className="rounded-full border border-[#ded2bf] bg-[#fffdf8]/80 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:border-orange-500 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-sm text-stone-600" aria-live="polite">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, totalResults)} of {totalResults}
            </p>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="rounded-full border border-[#ded2bf] bg-[#fffdf8]/80 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:border-orange-500 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </section>

      {isAddDressOpen && isMasterAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingDress) setIsAddDressOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-dress-title"
            className="my-auto w-full max-w-xl rounded-3xl border border-[#e7ddcc] bg-[#fffdf8] p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-800">Catalog management</p>
                <h2 id="add-dress-title" className="mt-2 font-serif text-3xl text-stone-900">Add a catalog item</h2>
                <p className="mt-2 text-sm text-stone-600">Add a new style to the collection.</p>
              </div>
              <button
                type="button"
                aria-label="Close add dress form"
                disabled={isSavingDress}
                onClick={() => setIsAddDressOpen(false)}
                className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDress} className="space-y-4">
              <label className="block text-sm font-medium text-stone-700">
                Item name
                <input name="name" required maxLength={100} className="mt-1.5 w-full rounded-xl border border-[#ded2bf] bg-white px-4 py-3 text-sm outline-none focus:border-orange-700" />
              </label>
              <div className="relative text-sm font-medium text-stone-700">
                <span id="new-item-category-label">Category</span>
                <button
                  type="button"
                  aria-labelledby="new-item-category-label"
                  aria-haspopup="listbox"
                  aria-expanded={isCategoryMenuOpen}
                  onClick={() => setIsCategoryMenuOpen((open) => !open)}
                  className={`mt-1.5 flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left outline-none transition focus:ring-2 focus:ring-orange-200 ${isCategoryMenuOpen ? "border-orange-700" : "border-[#ded2bf] hover:border-orange-400"}`}
                >
                  <span className={newItemCategory ? "text-stone-800" : "text-stone-400"}>
                    {newItemCategory || "Select a category"}
                  </span>
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 text-stone-600 transition-transform ${isCategoryMenuOpen ? "rotate-180" : ""}`}>
                    <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isCategoryMenuOpen && (
                  <div role="listbox" aria-labelledby="new-item-category-label" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-[#e7ddcc] bg-[#fffdf8] p-1.5 shadow-xl shadow-stone-900/10">
                    {garmentCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        role="option"
                        aria-selected={newItemCategory === category}
                        onClick={() => {
                          setNewItemCategory(category);
                          setIsCategoryMenuOpen(false);
                          setCreateDressError("");
                        }}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-left transition ${newItemCategory === category ? "bg-orange-50 font-semibold text-orange-900" : "text-stone-700 hover:bg-[#f7f1e6] hover:text-stone-900"}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="block text-sm font-medium text-stone-700">
                Description
                <textarea name="description" rows={3} maxLength={1000} className="mt-1.5 w-full resize-y rounded-xl border border-[#ded2bf] bg-white px-4 py-3 text-sm outline-none focus:border-orange-700" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-stone-700">
                  Price (₹)
                  <input name="basePrice" type="number" min="0" step="1" required className="mt-1.5 w-full rounded-xl border border-[#ded2bf] bg-white px-4 py-3 text-sm outline-none focus:border-orange-700" />
                </label>
                <label className="block text-sm font-medium text-stone-700">
                  Estimated tailoring days
                  <input name="estimatedDays" type="number" min="1" max="365" defaultValue="7" required className="mt-1.5 w-full rounded-xl border border-[#ded2bf] bg-white px-4 py-3 text-sm outline-none focus:border-orange-700" />
                </label>
              </div>
              <div>
                <label htmlFor="garment-image-files" className="block text-sm font-medium text-stone-700">
                  Upload images <span className="font-normal text-stone-500">(up to 5, JPG, PNG, or WebP; 5 MB each)</span>
                </label>
                <input
                  id="garment-image-files"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    clearSelectedImages();
                    if (files.length > 5) {
                      setCreateDressError("Choose no more than 5 images.");
                      event.target.value = "";
                      return;
                    }
                    setCreateDressError("");
                    setSelectedImages(files.map((file) => {
                      const preview = URL.createObjectURL(file);
                      imageObjectUrls.current.add(preview);
                      return { file, preview };
                    }));
                  }}
                  className="mt-1.5 block w-full cursor-pointer rounded-xl border border-dashed border-[#d9c9b3] bg-[#fffaf1] text-sm text-stone-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-[#853b20] file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-orange-800"
                />
                {selectedImages.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {selectedImages.map(({ file, preview }, index) => (
                      <li key={`${file.name}-${index}`} className="relative">
                        <Image src={preview} alt={`Selected garment image ${index + 1}`} width={64} height={80} unoptimized className="h-20 w-16 rounded-xl border border-[#e7ddcc] object-cover" />
                        <button
                          type="button"
                          aria-label={`Remove image ${index + 1}`}
                          onClick={() => {
                            const [removed] = selectedImages.slice(index, index + 1);
                            if (removed) {
                              URL.revokeObjectURL(removed.preview);
                              imageObjectUrls.current.delete(removed.preview);
                            }
                            setSelectedImages((files) => files.filter((_, fileIndex) => fileIndex !== index));
                          }}
                          className="absolute -right-2 -top-2 rounded-full bg-stone-900 p-1 text-white shadow transition hover:bg-red-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {createDressError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{createDressError}</p>}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={isSavingDress} onClick={() => setIsAddDressOpen(false)} className="rounded-full border border-[#ded2bf] px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSavingDress} className="rounded-full bg-[#853b20] px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60">
                  {isSavingDress ? "Adding item…" : "Add new"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
