import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import RouteTitle from "./RouteTitle";

export const metadata: Metadata = {
    title: "Darzaani | Custom Stitching & Tailoring",
    description:
        "Bespoke custom tailoring platform connecting customers and artisanal tailors.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="font-sans">
                <Suspense fallback={null}>
                    <RouteTitle />
                </Suspense>
                <AuthProvider>
                    <CartProvider>
                        <Navbar />
                        <main className="min-h-screen bg-transparent text-gray-900">
                            {children}
                        </main>
                    </CartProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
