"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { getSafeReturnPath } from "@/lib/redirect";
import { useAuth } from "@/context/AuthContext";

interface GoogleAuthButtonProps {
  buttonText?: string;
  variant?: "default" | "compact" | "signup";
  className?: string;
}

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme: "outline";
              size: "large" | "medium";
              text: "signin_with" | "signup_with";
              shape: "pill";
              logo_alignment: "center";
              width: number;
            },
          ) => void;
        };
      };
    };
  }
}

export default function GoogleAuthButton({
  buttonText = "Continue with Google",
  variant = "default",
  className = "",
}: GoogleAuthButtonProps) {
  const { login } = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    const renderGoogleButton = () => {
      const element = buttonRef.current;
      const googleIdentity = window.google?.accounts.id;
      if (cancelled || !element || !googleIdentity) return;

      googleIdentity.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setError("");
          setLoading(true);
          try {
            const response = await API.post("/users/google", { idToken: credential });
            login(response.data.token, response.data.data.user);
            router.push(getSafeReturnPath());
          } catch (authError) {
            const message = (authError as {
              response?: { data?: { message?: string } };
            }).response?.data?.message;
            setError(message || "Google sign-in could not be completed. Please try again.");
          } finally {
            setLoading(false);
          }
        },
      });

      element.replaceChildren();
      googleIdentity.renderButton(element, {
        theme: "outline",
        size: variant === "compact" ? "medium" : "large",
        text: variant === "signup" ? "signup_with" : "signin_with",
        shape: "pill",
        logo_alignment: "center",
        width: Math.min(element.clientWidth || 400, 400),
      });
    };

    const existingScript = document.getElementById("google-identity-services");
    if (window.google?.accounts.id) {
      renderGoogleButton();
    } else if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton);
    } else {
      const script = document.createElement("script");
      script.id = "google-identity-services";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      script.onerror = () => setError("Google sign-in could not be loaded.");
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      existingScript?.removeEventListener("load", renderGoogleButton);
    };
  }, [clientId, login, router, variant]);

  return (
    <div className={className}>
      {clientId ? (
        <div
          ref={buttonRef}
          aria-label={buttonText}
          className="flex min-h-11 w-full items-center justify-center"
        />
      ) : (
        <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-center text-xs text-stone-500">
          Google sign-in is unavailable until it is configured.
        </p>
      )}
      {loading && <p className="mt-2 text-center text-xs text-stone-500">Signing in with Google…</p>}
      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
