import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Darzani | Custom Stitching & Tailoring",
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
            <body className={inter.className}>
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
