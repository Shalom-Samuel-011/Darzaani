"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CartPage() {
  const { items, subtotal, removeItem, updateQuantity, isLoading, error } = useCart();

  return (
    <div className="min-h-screen bg-transparent px-5 pb-24 pt-12 text-stone-900 sm:px-8 sm:pt-16">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.23em] text-orange-800">
          Your fitting bag
        </p>
        <h1 className="font-serif text-4xl font-medium text-stone-900 sm:text-5xl">
          Pieces chosen for you
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Review your selections and fit preferences before your fitting.
        </p>

        {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}

        {isLoading ? (
          <div className="mt-10 rounded-[2rem] border border-[#e7ddcc] bg-[#fffdf8]/85 px-6 py-16 text-center text-sm text-stone-600" role="status">
            Loading your fitting bag…
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-[#e7ddcc] bg-[#fffdf8]/85 px-6 py-16 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-9 w-9 text-orange-800" />
            <h2 className="mt-5 font-serif text-2xl text-stone-900">Your fitting bag is empty</h2>
            <p className="mt-2 text-sm text-stone-600">Explore the collection and save a piece you love.</p>
            <Link
              href="/catalog"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#853b20] px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-800"
            >
              Browse the collection
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-5 rounded-[1.6rem] border border-[#e7ddcc] bg-[#fffdf8]/90 p-4 shadow-sm sm:grid-cols-[150px_1fr] sm:p-5"
                >
                  <Link
                    href={`/catalog/${item.garment._id}`}
                    className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-cream-200 sm:aspect-[4/4.5]"
                    aria-label={`View ${item.garment.name}`}
                  >
                    <Image
                      src={item.garment.images?.[0] || "/images/saree-card.webp"}
                      alt={item.garment.name}
                      fill
                      sizes="150px"
                      unoptimized
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex flex-col justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-orange-800">
                            {item.garment.category}
                          </p>
                          <Link href={`/catalog/${item.garment._id}`} className="mt-1 block font-serif text-xl font-semibold text-stone-900 hover:text-orange-800">
                            {item.garment.name}
                          </Link>
                        </div>
                        <p className="font-semibold text-orange-800">
                          {formatPrice(item.garment.basePrice * item.quantity)}
                        </p>
                      </div>
                      <p className="mt-3 text-sm text-stone-600">
                        Colour: <span className="font-medium text-stone-800">{item.selectedColor}</span>
                        <span className="mx-2 text-stone-300">·</span>
                        Fit: <span className="font-medium text-stone-800">
                          {item.sizingTypeUsed === "custom"
                            ? `Made to measure${item.selectedMeasurementProfileTitle ? ` · ${item.selectedMeasurementProfileTitle}` : ""}`
                            : item.selectedStandardSize}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Crafted in about {item.garment.estimatedDays} days
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="inline-flex items-center rounded-full border border-[#ded2bf] bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={`Decrease quantity of ${item.garment.name}`}
                          className="rounded-l-full p-2.5 text-stone-600 transition hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.garment.name}`}
                          className="rounded-r-full p-2.5 text-stone-600 transition hover:text-orange-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 transition hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="rounded-[1.6rem] border border-[#e7ddcc] bg-[#fffdf8]/90 p-6 shadow-sm lg:sticky lg:top-28">
              <h2 className="font-serif text-2xl text-stone-900">Bag summary</h2>
              <div className="mt-5 flex justify-between border-b border-[#eee5d7] pb-4 text-sm text-stone-600">
                <span>Pieces</span>
                <span>{items.reduce((count, item) => count + item.quantity, 0)}</span>
              </div>
              <div className="mt-4 flex justify-between text-sm font-semibold text-stone-900">
                <span>Estimated subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-stone-500">
                Final fit, fabric, and delivery details can be confirmed with the atelier during your fitting.
              </p>
              <Link
                href="/catalog"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#ded2bf] px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-orange-600 hover:text-orange-800"
              >
                Continue browsing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
