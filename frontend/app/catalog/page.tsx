"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { ArrowRight, Clock3, Ruler, Search } from "lucide-react";
import API from "@/lib/api";
import type { Garment } from "@/types";

const categories = [
  "All pieces",
  "Sarees & Blouses",
  "Kurtis & Sets",
  "Lehengas",
] as const;

const PAGE_SIZE = 10;

function ProductCard({ garment }: { garment: Garment }) {
  const image = garment.images?.[0] || "/images/saree-card.webp";

  return (
    <Link href={`/catalog/${garment._id}`} className="group block overflow-hidden rounded-[1.6rem] border border-[#e7ddcc] bg-[#fffdf8] shadow-[0_8px_30px_rgba(72,51,27,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(72,51,27,0.1)]">
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
  );
}

export default function CatalogPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All pieces");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    if (category && categories.includes(category as (typeof categories)[number])) {
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
          setGarments(response.data.data.garments || []);
          setTotalResults(response.data.totalResults ?? response.data.results ?? 0);
          setTotalPages(response.data.totalPages ?? 0);
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
  }, [currentPage, retry, search, selectedCategory]);

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
          {!loading && !error && (
            <p className="text-xs text-stone-500">
              {totalResults} {totalResults === 1 ? "piece" : "pieces"}
            </p>
          )}
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
              <ProductCard key={garment._id} garment={garment} />
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
    </div>
  );
}
