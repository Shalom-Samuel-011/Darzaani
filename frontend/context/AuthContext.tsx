"use client";

import React, {
  createContext,
  useContext,
  useState,
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

  // A full navigation prevents protected page effects from racing the logout
  // destination after the authenticated user state is cleared.
  const logout = useCallback((redirectTo = "/") => {
    localStorage.removeItem("darzani_token");
    localStorage.removeItem("darzani_user");
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") window.location.replace(redirectTo);
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
    } catch (error) {
      // Differentiate between auth errors (401/403) and network/other errors
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosError.response?.status;
      const isAuthError = status === 401 || status === 403;

      if (isAuthError) {
        // Token is truly invalid/expired — clear it and redirect
        if (localStorage.getItem("darzani_token") === currentToken) {
          const currentPath = `${window.location.pathname}${window.location.search}`;
          logout(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
      } else if (!navigator.onLine) {
        // Offline — don't logout, just keep existing token/user state
        // The token remains valid; we'll revalidate when connectivity returns
        if (currentToken) {
          // Try to restore user from localStorage if we have it
          const cachedUser = localStorage.getItem("darzani_user");
          if (cachedUser) {
            try {
              setUser(JSON.parse(cachedUser));
            } catch {
              // Ignore parse errors
            }
          }
        }
      } else {
        // Other network/server errors (500, timeout, etc.) — don't logout
        // Keep the current token/user state and let user retry manually
        console.warn("Auth check failed, retaining current session:", axiosError.response?.data?.message || error);
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

        // Only handle 401 if it's a true auth error (not network failure)
        if (error.response?.status === 401 && !isPublicAuthRequest && responseIsForCurrentSession) {
          const currentPath = `${window.location.pathname}${window.location.search}`;
          logout(`/login?redirect=${encodeURIComponent(currentPath)}`);
        } else if (!error.response && !navigator.onLine) {
          // Network error while offline - don't logout, let the request fail naturally
          // The user will see the error in the UI and can retry when back online
        } else if (error.response?.status >= 500) {
          // Server errors (5xx) - don't logout, let the request fail naturally
          // User can retry the action
        }
        return Promise.reject(error);
      }
    );

    // Restore the browser session after hydration; this intentionally updates auth state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
