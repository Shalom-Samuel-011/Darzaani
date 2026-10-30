"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import type { RazorpayOptions, RazorpayPaymentResponse } from "@/types/razorpay";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Branch } from "@/types";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import AdminActionDropdown from "@/components/admin/AdminActionDropdown";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CartPage() {
  const { items, subtotal, removeItem, updateQuantity, isLoading, error, refreshCart } = useCart();
  const { user } = useAuth();
  const [address, setAddress] = useState({ street: "", city: "", state: "", pincode: "", phone: user?.phone || "" });
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutScriptReady, setCheckoutScriptReady] = useState(false);
  const [inventoryBlockedKey, setInventoryBlockedKey] = useState("");
  const [demoBranches, setDemoBranches] = useState<Branch[]>([]);
  const [selectedDemoBranch, setSelectedDemoBranch] = useState("");
  const isDemoCustomer = user?.email === "customer@darzaani.com";
  const availabilityKey = JSON.stringify({ address, items: items.map((item) => [item.id, item.quantity]) });
  const inventoryBlocked = inventoryBlockedKey === availabilityKey;

  useEffect(() => {
    const syncCartWhenReturning = () => {
      if (document.visibilityState === "visible") {
        void refreshCart().catch(() => undefined);
      }
    };

    window.addEventListener("focus", syncCartWhenReturning);
    document.addEventListener("visibilitychange", syncCartWhenReturning);
    return () => {
      window.removeEventListener("focus", syncCartWhenReturning);
      document.removeEventListener("visibilitychange", syncCartWhenReturning);
    };
  }, [refreshCart]);

  useEffect(() => {
    if (!isDemoCustomer) return;
    let active = true;
    API.get("/branches").then((response) => {
      if (active) setDemoBranches(response.data.data.branches || []);
    }).catch(() => {
      if (active) setDemoBranches([]);
    });
    return () => { active = false; };
  }, [isDemoCustomer]);

  const recoverAlreadyPaidCheckout = async (status: number | undefined, message: string) => {
    if (status !== 409 || !message.toLowerCase().includes("already been paid")) return false;

    setCheckoutError("");
    setIsCheckingOut(false);
    await refreshCart().catch(() => undefined);
    // A full document navigation makes Orders mount with fresh auth and fetch
    // the order that the backend has just marked paid.
    window.location.replace("/orders?payment=success");
    return true;
  };

  const updateAddress = (field: keyof typeof address, value: string) => {
    setAddress((current) => ({ ...current, [field]: value }));
    setSelectedDemoBranch("");
    setCheckoutRequestId("");
    setCheckoutError("");
  };

  const selectDemoBranch = (branchId: string) => {
    const branch = demoBranches.find((candidate) => candidate._id === branchId);
    setSelectedDemoBranch(branchId);
    if (!branch) return;
    setAddress((current) => ({
      ...current,
      street: branch.address.street,
      city: branch.address.city,
      state: branch.address.state,
      pincode: branch.address.pincode,
    }));
    setCheckoutRequestId("");
    setCheckoutError("");
    setInventoryBlockedKey("");
  };

  const beginCheckout = async () => {
    if (!window.Razorpay) {
      setCheckoutError("Secure checkout is still loading. Please try again in a moment.");
      return;
    }
    setIsCheckingOut(true);
    setCheckoutError("");
    const requestId = checkoutRequestId || crypto.randomUUID();
    setCheckoutRequestId(requestId);

    try {
      const response = await API.post("/order/checkout", {
        requestId,
        deliveryAddress: address,
        ...(isDemoCustomer && selectedDemoBranch ? { demoLocationBranchId: selectedDemoBranch } : {}),
      });
      const checkout = response.data.data.checkout as {
        localOrderId: string;
        razorpayOrderId: string;
        keyId: string;
        amount: number;
        currency: "INR";
      };
      const paymentOptions: RazorpayOptions = {
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: "Darzaani Atelier",
        description: "Bespoke pieces from your fitting bag",
        order_id: checkout.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email, contact: address.phone },
        theme: { color: "#853b20" },
        handler: async (payment: RazorpayPaymentResponse) => {
          try {
            await API.post(`/order/${checkout.localOrderId}/verify-payment`, payment);
            await refreshCart().catch(() => undefined);
            window.location.replace(`/orders?payment=success&order=${checkout.localOrderId}`);
          } catch (requestError) {
            const failure = requestError as { response?: { status?: number; data?: { message?: string } } };
            if (await recoverAlreadyPaidCheckout(failure.response?.status, failure.response?.data?.message || "")) return;
            setCheckoutError(failure.response?.data?.message || "We could not confirm the payment yet. Check My orders before trying again.");
            setIsCheckingOut(false);
          }
        },
        modal: { ondismiss: () => setIsCheckingOut(false) },
      };
      const checkoutModal = new window.Razorpay(paymentOptions);
      checkoutModal.open();
    } catch (requestError) {
      const failure = requestError as { response?: { status?: number; data?: { message?: string } } };
      if (await recoverAlreadyPaidCheckout(failure.response?.status, failure.response?.data?.message || "")) return;
      const message = failure.response?.data?.message || "We could not prepare secure checkout. Please try again.";
      if (failure.response?.status === 409 && message.toLowerCase().startsWith("coming soon:")) setInventoryBlockedKey(availabilityKey);
      setCheckoutError(message);
      setIsCheckingOut(false);
    }
  };

  if (user && user.role !== "customer") {
    const workspace = user.role === "branch-manager" ? "/manager" : user.role === "master-admin" ? "/admin" : "/catalog";
    return <main className="flex min-h-[70vh] items-center justify-center px-5 py-16 text-center"><section className="max-w-md rounded-3xl border border-[#e7ddcc] bg-[#fffdf8] p-8 shadow-sm"><h1 className="font-serif text-3xl text-stone-900">Customer checkout</h1><p className="mt-3 text-sm leading-6 text-stone-600">Staff accounts manage atelier operations. Sign in with a customer account to place an order.</p><Link href={workspace} className="mt-6 inline-flex rounded-full bg-[#853b20] px-5 py-3 text-sm font-semibold text-white hover:bg-orange-800">Return to your workspace</Link></section></main>;
  }

  return (
    <>
    <Script
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="lazyOnload"
      onReady={() => setCheckoutScriptReady(true)}
      onError={() => setCheckoutScriptReady(false)}
    />
    <div className="min-h-screen bg-transparent px-5 pb-24 pt-12 text-stone-900 sm:px-8 sm:pt-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.23em] text-orange-800">
              Your fitting bag
            </p>
            <h1 className="font-serif text-4xl font-medium text-stone-900 sm:text-5xl">
              Pieces chosen for you
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Review your selections and fit preferences before your fitting.
            </p>
          </div>
          {!isLoading && items.length > 0 && (
            <Link
              href="#checkout"
              className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#853b20] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-800"
            >
              Continue to checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

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
                          disabled={item.quantity <= 1 || isCheckingOut}
                          aria-label={`Decrease quantity of ${item.garment.name}`}
                          className="rounded-l-full p-2.5 text-stone-600 transition hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isCheckingOut}
                          aria-label={`Increase quantity of ${item.garment.name}`}
                          className="rounded-r-full p-2.5 text-stone-600 transition hover:text-orange-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={isCheckingOut}
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

            <aside id="checkout" className="scroll-mt-28 rounded-[1.6rem] border border-[#e7ddcc] bg-[#fffdf8]/90 p-6 shadow-sm lg:sticky lg:top-28">
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
                Your fit details stay with the atelier. We’ll route your order to the closest atelier that has every selected piece available.
              </p>
              <form className="mt-6 space-y-3" onSubmit={(event) => { event.preventDefault(); void beginCheckout(); }}>
                <h3 className="font-serif text-xl text-stone-900">Delivery details</h3>
                <p className="text-xs leading-5 text-stone-500">At checkout, nearby branch availability is checked automatically. If a piece is unavailable everywhere, we’ll let you know.</p>
                {isDemoCustomer && demoBranches.length > 0 && <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50/60 p-3">
                  <p className="text-xs font-medium text-stone-700">Demo delivery location</p>
                  <div className="mt-1.5">
                    <AdminActionDropdown
                      label="Choose a demo delivery location"
                      value={selectedDemoBranch}
                      placeholder="Choose a sample branch address"
                      fullWidth
                      options={demoBranches.map((branch) => ({ value: branch._id, label: `${branch.name} — ${branch.address.city}` }))}
                      onChange={selectDemoBranch}
                    />
                  </div>
                  <span className="mt-1.5 block leading-5 text-stone-500">Uses the branch’s saved map pin to find the nearest atelier with every selected piece in stock.</span>
                </div>}
                {([
                  ["street", "Street address"], ["city", "City"], ["state", "State"],
                  ["pincode", "PIN code"], ["phone", "Contact phone"],
                ] as const).map(([field, label]) => (
                  <label key={field} className="block text-xs font-medium text-stone-600">
                    {label}
                    <input
                      required
                      autoComplete={field === "street" ? "street-address" : field === "city" ? "address-level2" : field === "state" ? "address-level1" : field === "pincode" ? "postal-code" : "tel"}
                      inputMode={field === "phone" ? "tel" : field === "pincode" ? "numeric" : undefined}
                      value={field === "phone" ? address.phone || user?.phone || "" : address[field]}
                      onChange={(event) => updateAddress(field, event.target.value)}
                      maxLength={field === "phone" ? 20 : field === "pincode" ? 6 : 120}
                      pattern={field === "pincode" ? "[1-9][0-9]{5}" : undefined}
                      disabled={isCheckingOut}
                      className="mt-1.5 w-full rounded-xl border border-[#e7ddcc] bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-orange-700 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                ))}
                {checkoutError && <div className={`rounded-xl border px-3.5 py-3 text-sm ${inventoryBlocked ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-700"}`} role="alert"><p>{checkoutError}</p>{inventoryBlocked && <button type="button" onClick={() => { setInventoryBlockedKey(""); setCheckoutError(""); }} className="mt-2 font-semibold underline underline-offset-2">Check availability again</button>}</div>}
                <button
                  type="submit"
                  disabled={isCheckingOut || !checkoutScriptReady || !user || inventoryBlocked}
                  className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#853b20] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCheckingOut ? "Preparing secure checkout…" : checkoutScriptReady ? "Continue to secure payment" : "Loading secure checkout…"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-center text-[11px] leading-4 text-stone-500">Payment is encrypted and processed by Razorpay. Your fitting bag is cleared only after the atelier confirms payment.</p>
              </form>
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
    </>
  );
}
