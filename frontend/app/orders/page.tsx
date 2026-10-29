"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import API from "@/lib/api";
import { Order } from "@/types";

const ORDER_STEPS = [
    { key: "order_placed", label: "Placed" },
    { key: "awaiting_fabric", label: "Awaiting Fabric" },
    { key: "fabric_received", label: "Fabric Received" },
    { key: "stitching", label: "Stitching" },
    { key: "trial_ready", label: "Trial Ready" },
    { key: "dispatched", label: "Dispatched" },
    { key: "delivered", label: "Delivered" },
];

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await API.get("/orders/my-orders");
                setOrders(res.data.data.orders || res.data.data || []);
            } catch (err) {
                const error = err as AxiosError<{ message?: string }>;
                setError(
                    error.response?.data?.message ||
                        "Failed to fetch order history.",
                );
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const getStatusStepIndex = (status: string) => {
        const idx = ORDER_STEPS.findIndex((s) => s.key === status);
        return idx !== -1 ? idx : 0;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="rounded-full h-10 w-10 border-2 border-cream-300 animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    My Orders & Tracking
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Real-time status tracking for your custom tailored garments.
                </p>
            </div>

            {error && (
                <div className="mb-6 rounded-lg bg-orange-50 p-3 text-sm text-orange-600 border border-orange-200">
                    {error}
                </div>
            )}

            {orders.length === 0 && !error ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-cream-200 p-8 shadow-sm">
                    <p className="text-gray-500 font-medium mb-4">
                        You haven&apos;t placed any custom orders yet.
                    </p>
                    <Link
                        href="/catalog"
                        className="text-xs font-semibold bg-orange-600 text-white px-5 py-2.5 rounded-lg hover:bg-orange-700 transition inline-block"
                    >
                        Explore Bespoke Catalog
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => {
                        const currentStep = getStatusStepIndex(order.status);

                        return (
                            <div
                                key={order._id}
                                className="bg-white rounded-3xl border border-cream-200 shadow-sm p-6 md:p-8"
                            >
                                {/* Top Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-200 pb-4 mb-6">
                                    <div>
                                        <span className="text-xs text-gray-400 block font-mono">
                                            ORDER #
                                            {order._id.slice(-8).toUpperCase()}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Placed on{" "}
                                            {new Date(
                                                order.createdAt,
                                            ).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                                            {order.status.replace(/_/g, " ")}
                                        </span>
                                        <span className="text-lg font-bold text-gray-900">
                                            ₹{order.totalAmount}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Items Summary */}
                                <div className="mb-6 space-y-3">
                                    {order.items.map((item, idx) => (
                                        <div
                                            key={item._id || idx}
                                            className="flex justify-between items-start bg-cream-100 rounded-xl p-4"
                                        >
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">
                                                    {typeof item.garment ===
                                                        "object"
                                                            ? item.garment.name
                                                            : "Custom Tailoring Item"}
                                                </h4>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Sizing:{" "}
                                                    <strong className="capitalize text-gray-700">
                                                        {item.sizingTypeUsed}
                                                    </strong>
                                                    {item.selectedStandardSize &&
                                                        ` (${item.selectedStandardSize})`}
                                                    | Fabric:{" "}
                                                    <strong className="text-gray-700">
                                                        {item.fabricSource ===
                                                            "provided_by_customer"
                                                                ? "Customer Provided"
                                                                : "Boutique Sourced"}
                                                    </strong>
                                                </p>
                                                {item.customizationNotes && (
                                                    <p className="text-xs text-gray-600 mt-1 italic">
                                                        Note: "
                                                        {
                                                            item.customizationNotes
                                                        }
                                                        "
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-sm font-semibold text-orange-600">
                                                ₹{item.itemPrice}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Tailoring Progress Timeline Bar */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                        Stitching Progress
                                    </h4>
                                    <div className="grid grid-cols-7 gap-1 text-center">
                                        {ORDER_STEPS.map((step, idx) => {
                                            const isCompleted =
                                                idx <= currentStep;
                                            return (
                                                <div
                                                    key={step.key}
                                                    className="flex flex-col items-center"
                                                >
                                                    <div
                                                        className={`w-full h-1.5 rounded-full mb-2 transition ${
                                                            isCompleted
                                                                ? "bg-orange-600"
                                                                : "border-cream-200"
                                                        }`}
                                                    />
                                                    <span
                                                        className={`text-[10px] font-medium leading-tight ${
                                                            isCompleted
                                                                ? "text-orange-700 font-bold"
                                                                : "text-gray-500"
                                                        }`}
                                                    >
                                                        {step.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}