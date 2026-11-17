import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Darzaani",
  description: "Darzaani's Privacy Policy is being prepared.",
};

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <div className="rounded-3xl border border-[#e3d8c6] bg-white/70 p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-800">
          Darzaani
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-stone-900">
          Privacy Policy
        </h1>
        <p className="mt-6 leading-7 text-stone-700">
          This page is a temporary placeholder. Darzaani&apos;s Privacy Policy
          is being prepared and will be published here.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[#873b20] px-5 py-3 text-sm font-semibold text-[#fffaf2] transition hover:bg-orange-800"
        >
          Return to home
        </Link>
      </div>
    </section>
  );
}
