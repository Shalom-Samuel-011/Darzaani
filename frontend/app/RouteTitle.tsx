"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const routeTitles: Record<string, string> = {
    "/": "Home",
    "/catalog": "Catalog",
    "/tailor": "Tailor Workspace",
    "/measurements": "Measurements",
    "/cart": "Shopping Cart",
    "/orders": "My Orders",
    "/login": "Log In",
    "/signup": "Create Account",
    "/forgot-password": "Forgot Password",
    "/reset-password": "Reset Password",
    "/admin": "Admin Dashboard",
    "/admin/users": "Manage Users",
    "/admin/orders": "Manage Orders",
    "/admin/consultations": "Manage Consultations",
    "/manager": "Manager Dashboard",
};

export default function RouteTitle() {
    const pathname = usePathname();

    useEffect(() => {
        const exactTitle = routeTitles[pathname];
        const title = exactTitle ?? (
            pathname.startsWith("/catalog/") ? "Product Details" :
            pathname.startsWith("/reset-password/") ? "Reset Password" :
            pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? "Home"
        );

        document.title = pathname === "/"
            ? "Darzaani | Custom Stitching & Tailoring"
            : `${title} | Darzaani`;
    }, [pathname]);

    return null;
}
