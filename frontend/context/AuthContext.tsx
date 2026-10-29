"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { User } from "@/types";
import API from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: (redirectTo?: string) => void;
  initiatePasswordReset: (email: string) => Promise<boolean>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Start with the same state during SSR and the browser's first render.
  // Auth is restored in checkAuth after hydration.
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Use a ref for router so we don't need it at render time (avoids SSR issues).
  // We import dynamically only when we actually need to navigate.
  const routerRef = useRef<ReturnType<
    typeof import("next/navigation")["useRouter"]
  > | null>(null);

  // Stable logout — useCallback so the interceptor closure always gets the
  // latest version without needing it as a dep.
  const logout = useCallback((redirectTo = "/") => {
    localStorage.removeItem("darzani_token");
    localStorage.removeItem("darzani_user");
    setToken(null);
    setUser(null);
    routerRef.current?.push(redirectTo);
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const currentToken = localStorage.getItem("darzani_token");
    try {
      setToken(currentToken);
      if (currentToken) {
        const response = await API.get("/users/me");
        if (response.data.data.user) {
          const freshUser = response.data.data.user;
          setUser(freshUser);
          localStorage.setItem("darzani_user", JSON.stringify(freshUser));
        }
      }
    } catch {
      // Token invalid or expired — clear it silently
      if (localStorage.getItem("darzani_token") === currentToken) {
        const currentPath = `${window.location.pathname}${window.location.search}`;
        logout(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Setup axios interceptors once on mount
  useEffect(() => {
    const requestInterceptor = API.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem("darzani_token");
      if (currentToken && config.headers) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    });

    const responseInterceptor = API.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || "";
        const isPublicAuthRequest = /\/users\/(login|signup|google|forgotPassword|resetPassword)/i.test(requestUrl);
        const authorization = originalRequest?.headers?.Authorization || originalRequest?.headers?.get?.("Authorization");
        const storedToken = localStorage.getItem("darzani_token");
        const responseIsForCurrentSession = !authorization || authorization === `Bearer ${storedToken}`;
        if (error.response?.status === 401 && !isPublicAuthRequest && responseIsForCurrentSession) {
          const currentPath = `${window.location.pathname}${window.location.search}`;
          logout(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
        return Promise.reject(error);
      }
    );

    checkAuth();

    return () => {
      API.interceptors.request.eject(requestInterceptor);
      API.interceptors.response.eject(responseInterceptor);
    };
  }, [checkAuth, logout]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("darzani_token", newToken);
    localStorage.setItem("darzani_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const initiatePasswordReset = async (email: string): Promise<boolean> => {
    try {
      await API.post("/users/forgotPassword", { email });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        initiatePasswordReset,
        checkAuth,
      }}
    >
      <RouterCapture ref={routerRef} />
      {children}
    </AuthContext.Provider>
  );
};

// Tiny client component that grabs the router and stores it in the ref.
// This is the correct way to use useRouter inside a provider without
// calling it at the top level before hydration.
import { useRouter } from "next/navigation";
import { forwardRef, useImperativeHandle } from "react";

const RouterCapture = forwardRef<
  ReturnType<typeof useRouter> | null,
  object
>((_props, ref) => {
  const router = useRouter();
  useImperativeHandle(ref, () => router, [router]);
  return null;
});
RouterCapture.displayName = "RouterCapture";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
