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
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?._id ?? null;
  const userIdRef = useRef(userId);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const acceptItems = useCallback((forUserId: string, nextItems: CartLineItem[]) => {
    if (userIdRef.current === forUserId) setItems(nextItems);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setItems([]);
      setLoadedUserId(null);
      setError("");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError("");
    API.get("/users/me/cart")
      .then((response) => {
        if (cancelled) return;
        setItems(response.data.data.items as CartLineItem[]);
        setLoadedUserId(userId);
      })
      .catch((requestError: { response?: { data?: { message?: string } } }) => {
        if (cancelled) return;
        setItems([]);
        setError(requestError.response?.data?.message || "Could not load your fitting bag.");
        setLoadedUserId(userId);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  const addItem = useCallback(async (item: Omit<CartLineItem, "id" | "quantity">) => {
    if (!userId) throw new Error("Sign in to add a piece to your fitting bag.");
    setError("");
    try {
      const response = await API.post("/users/me/cart/items", {
        garment: item.garment._id,
        sizingTypeUsed: item.sizingTypeUsed,
        selectedStandardSize: item.selectedStandardSize,
        selectedMeasurementProfileId: item.selectedMeasurementProfileId,
        selectedColor: item.selectedColor,
      });
      acceptItems(userId, response.data.data.items as CartLineItem[]);
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Could not add this piece to your fitting bag.";
      setError(message);
      throw new Error(message);
    }
  }, [acceptItems, userId]);

  const removeItem = useCallback(async (id: string) => {
    if (!userId) return;
    setError("");
    try {
      const response = await API.delete(`/users/me/cart/items/${id}`);
      acceptItems(userId, response.data.data.items as CartLineItem[]);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Could not remove this piece.");
    }
  }, [acceptItems, userId]);

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    if (!userId) return;
    setError("");
    try {
      const response = await API.patch(`/users/me/cart/items/${id}`, { quantity });
      acceptItems(userId, response.data.data.items as CartLineItem[]);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Could not update the quantity.");
    }
  }, [acceptItems, userId]);

  const clearCart = useCallback(async () => {
    if (!userId) return;
    setError("");
    try {
      await API.delete("/users/me/cart");
      acceptItems(userId, []);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Could not clear your fitting bag.");
    }
  }, [acceptItems, userId]);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.garment.basePrice * item.quantity, 0),
      isLoading: authLoading || isLoading || (!!userId && loadedUserId !== userId),
      error,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, authLoading, isLoading, loadedUserId, userId, error, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
