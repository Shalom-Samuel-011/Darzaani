"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartLineItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";

interface CartContextValue {
  items: CartLineItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  error: string;
  addItem: (item: Omit<CartLineItem, "id" | "quantity">) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const CART_STORAGE_KEY = "darzani_cart_cache";
const CART_USER_KEY = "darzani_cart_user";

function loadCachedCart(): { items: CartLineItem[]; userId: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CART_STORAGE_KEY);
    const cachedUser = localStorage.getItem(CART_USER_KEY);
    if (cached && cachedUser) {
      return { items: JSON.parse(cached), userId: cachedUser };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveCachedCart(userId: string, items: CartLineItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(CART_USER_KEY, userId);
  } catch {
    // Ignore storage errors (quota, etc.)
  }
}

function clearCachedCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem(CART_USER_KEY);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.role === "customer" ? user._id : null;
  const userIdRef = useRef(userId);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);

  // Keep userIdRef in sync
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Hydrate from cache on mount (before auth completes)
  useEffect(() => {
    const cached = loadCachedCart();
    if (cached && cached.userId === userId) {
      // Hydrate the customer-specific cart cache after the browser mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(cached.items);
      setLoadedUserId(cached.userId);
    }
    setHasHydrated(true);
  }, [userId]);

  // Accept items only if they belong to the current user
  const acceptItems = useCallback((forUserId: string, nextItems: CartLineItem[]) => {
    if (userIdRef.current === forUserId) {
      setItems(nextItems);
      saveCachedCart(forUserId, nextItems);
    }
  }, []);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY || !event.newValue) return;

      const cachedUser = localStorage.getItem(CART_USER_KEY);
      if (cachedUser && cachedUser === userIdRef.current) {
        try {
          const syncedItems = JSON.parse(event.newValue) as CartLineItem[];
          setItems(syncedItems);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch cart from server when user is authenticated
  useEffect(() => {
    if (authLoading || !userId) return;

    let cancelled = false;
    API.get("/users/me/cart")
      .then((response) => {
        if (cancelled) return;
        const serverItems = response.data.data.items as CartLineItem[];
        setItems(serverItems);
        setError("");
        setLoadedUserId(userId);
        saveCachedCart(userId, serverItems);
      })
      .catch((requestError: { response?: { data?: { message?: string } } }) => {
        if (cancelled) return;
        // If server fetch fails, keep cached items (if any) and show error
        if (items.length === 0) {
          setItems([]);
        }
        setError(requestError.response?.data?.message || "Could not load your fitting bag.");
        setLoadedUserId(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, items.length]);

  // Clear cart when user logs out (userId becomes null)
  useEffect(() => {
    if (userId === null && loadedUserId !== null) {
      // Drop private cart state when its owning customer logs out.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      setLoadedUserId(null);
      setError("");
      clearCachedCart();
    }
  }, [userId, loadedUserId]);

  const addItem = useCallback(async (item: Omit<CartLineItem, "id" | "quantity">) => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) throw new Error("Sign in to add a piece to your fitting bag.");
    setError("");
    try {
      const response = await API.post("/users/me/cart/items", {
        garment: item.garment._id,
        sizingTypeUsed: item.sizingTypeUsed,
        selectedStandardSize: item.selectedStandardSize,
        selectedMeasurementProfileId: item.selectedMeasurementProfileId,
        selectedColor: item.selectedColor,
      });
      acceptItems(currentUserId, response.data.data.items as CartLineItem[]);
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Could not add this piece to your fitting bag.";
      setError(message);
      throw new Error(message);
    }
  }, [acceptItems]);

  const removeItem = useCallback(async (id: string) => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;
    setError("");
    try {
      const response = await API.delete(`/users/me/cart/items/${id}`);
      acceptItems(currentUserId, response.data.data.items as CartLineItem[]);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Could not remove this piece.");
    }
  }, [acceptItems]);

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;
    setError("");
    try {
      const response = await API.patch(`/users/me/cart/items/${id}`, { quantity });
      acceptItems(currentUserId, response.data.data.items as CartLineItem[]);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Could not update the quantity.");
    }
  }, [acceptItems]);

  const clearCart = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;
    setError("");
    try {
      await API.delete("/users/me/cart");
      acceptItems(currentUserId, []);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Could not clear your fitting bag.");
    }
  }, [acceptItems]);

  const refreshCart = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;
    const response = await API.get("/users/me/cart");
    acceptItems(currentUserId, response.data.data.items as CartLineItem[]);
  }, [acceptItems]);

  const value = useMemo(
    () => ({
      items: userId ? items : [],
      itemCount: userId ? items.reduce((count, item) => count + item.quantity, 0) : 0,
      subtotal: userId ? items.reduce((sum, item) => sum + item.garment.basePrice * item.quantity, 0) : 0,
      isLoading: authLoading || (!!userId && loadedUserId !== userId && !hasHydrated),
      error: userId && loadedUserId === userId ? error : "",
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      refreshCart,
    }),
    [items, authLoading, loadedUserId, userId, error, hasHydrated, addItem, removeItem, updateQuantity, clearCart, refreshCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
