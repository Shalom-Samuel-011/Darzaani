"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Noto_Sans_Devanagari } from "next/font/google";
import { useCart } from "@/context/CartContext";

const devanagariFont = Noto_Sans_Devanagari({
  weight: ["600", "700"],
  subsets: ["devanagari", "latin"],
});

const navLinkClass =
  "rounded-full px-4 py-2 text-[13px] font-medium tracking-wide text-stone-700 transition-colors hover:bg-white/70 hover:text-orange-800";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#dfd4c1]/80 bg-[#f4eee1]/90 shadow-[0_5px_24px_rgba(69,48,26,0.045)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex h-[76px] items-center justify-between">
          <Link
            href="/#top"
            className="group flex items-center gap-3"
            aria-label="Darzaani Atelier home"
          >
            <span className="font-serif text-[27px] font-semibold tracking-[-0.045em] text-[#853b20] transition-colors group-hover:text-orange-800 sm:text-[29px]">
              Dar<span className={`${devanagariFont.className} text-[#bd5d35]`}>ज़</span>aani
            </span>
            <span className="hidden border-l border-[#d6c8af] py-1 pl-3 text-[9px] font-medium uppercase tracking-[0.25em] text-[#92795c] sm:block">
              Atelier
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-full border border-[#e3d8c6]/80 bg-white/35 p-1.5 md:flex">
            <Link href="/#collections" className={navLinkClass}>
              Collections
            </Link>
            {user && (
              <>
                <Link href="/measurements" className={navLinkClass}>
                  My measurements
                </Link>
                <Link href="/orders" className={navLinkClass}>
                  My orders
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {user && (
              <Link
                href="/cart"
                aria-label={`Fitting bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                className="relative inline-flex items-center justify-center rounded-full p-2 text-stone-700 transition-colors hover:bg-white/70 hover:text-orange-800"
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#853b20] px-1 text-[10px] font-semibold text-white">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <>
                <span className="hidden text-xs text-stone-600 lg:block">
                  Welcome, <strong className="font-semibold text-stone-800">{user.name}</strong>
                </span>
                <motion.button
                  onClick={() => logout()}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full border border-[#d9cbb5] px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-orange-700 hover:text-orange-800"
                >
                  Log out
                </motion.button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-[13px] font-medium text-stone-700 transition-colors hover:text-orange-800 sm:block"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-[#873b20] px-5 py-2.5 text-[13px] font-semibold text-[#fffaf2] shadow-sm transition hover:bg-orange-800 hover:shadow-md"
                >
                  Get started
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-full border border-[#ded2bf] p-2 text-stone-700 transition hover:bg-white/70 md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden md:hidden"
            >
              <div className="flex flex-col gap-1 border-t border-[#dfd4c1]/80 py-3">
                <Link href="/#collections" onClick={closeMobileMenu} className={navLinkClass}>
                  Collections
                </Link>
                {user && (
                  <>
                    <Link href="/measurements" onClick={closeMobileMenu} className={navLinkClass}>
                      My measurements
                    </Link>
                    <Link href="/orders" onClick={closeMobileMenu} className={navLinkClass}>
                      My orders
                    </Link>
                  </>
                )}
                {!user && (
                  <Link href="/login" onClick={closeMobileMenu} className={navLinkClass}>
                    Log in
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
