"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import AdminRecordDetailsDialog, { type AdminRecordTarget } from "@/components/admin/AdminRecordDetailsDialog";
import {
  Building2,
  Users,
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  Plus,
  Eye,
  MapPin,
  Clock,
  CheckCircle,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  X,
  Star,
} from "lucide-react";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

interface Branch {
  _id: string;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
  };
  phone: string;
  manager?: {
    name: string;
    email: string;
  };
  isActive: boolean;
}

interface Activity {
  id: string;
  type: "consultation" | "order" | "user" | "review";
  message: string;
  branch?: string;
  status?: string;
  createdAt?: string;
}

interface Stats {
  totalBranches: number;
  pendingConsultations: number;
  activeOrders: number;
  revenueThisMonth: number;
  revenueChange: number;
  totalReviews: number;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalBranches: 0,
    pendingConsultations: 0,
    activeOrders: 0,
    revenueThisMonth: 0,
    revenueChange: 0,
    totalReviews: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [reviews, setReviews] = useState<{
    _id: string;
    customer: { name: string; email: string };
    rating: number;
    comment: string;
    createdAt: string;
  }[]>([]);
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [selectedActivityTarget, setSelectedActivityTarget] = useState<AdminRecordTarget | null>(null);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [branchSubmitting, setBranchSubmitting] = useState(false);
  const [branchFormError, setBranchFormError] = useState("");
  const [branchForm, setBranchForm] = useState({
    name: "", code: "", street: "", city: "", state: "", pincode: "", phone: "",
  });

  const updateBranchField = (field: keyof typeof branchForm, value: string) => {
    setBranchForm((current) => ({ ...current, [field]: value }));
  };

  const submitNewBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBranchFormError("");
    setBranchSubmitting(true);
    try {
      const response = await API.post("/branches", {
        name: branchForm.name.trim(),
        code: branchForm.code.trim().toLowerCase(),
        address: {
          street: branchForm.street.trim(),
          city: branchForm.city.trim(),
          state: branchForm.state.trim(),
          pincode: branchForm.pincode.trim(),
        },
        phone: branchForm.phone.trim(),
      });
      const createdBranch = response.data.data?.branch as Branch | undefined;
      if (createdBranch) setBranches((current) => [createdBranch, ...current.filter((branch) => branch._id !== createdBranch._id)]);
      setStats((current) => ({ ...current, totalBranches: current.totalBranches + 1 }));
      setBranchForm({ name: "", code: "", street: "", city: "", state: "", pincode: "", phone: "" });
      setIsAddBranchOpen(false);
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setBranchFormError(apiError.response?.data?.message || "Could not create the branch. Please check the details and try again.");
    } finally {
      setBranchSubmitting(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login?redirect=/admin");
      return;
    }

    if (user.role !== "master-admin") {
      return;
    }

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, activityRes, branchesRes, reviewsRes] = await Promise.all([
          API.get("/admin/stats").catch(() => null),
          API.get("/admin/activity").catch(() => null),
          API.get("/branches").catch(() => null),
          API.get("/reviews").catch(() => null),
        ]);

        if (statsRes?.data?.data?.stats) {
          setStats(statsRes.data.data.stats);
        }
        if (activityRes?.data?.data?.activities) {
          setActivities(activityRes.data.data.activities);
        }
        if (branchesRes?.data?.data?.branches) {
          setBranches(branchesRes.data.data.branches);
        }
        if (reviewsRes?.data?.data?.reviews) {
          setReviews(reviewsRes.data.data.reviews);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, authLoading, router]);

  const openActivityDetails = (activity: Activity) => {
    if (activity.type === "consultation" || activity.type === "order") {
      setSelectedActivityTarget({ kind: activity.type, id: activity.id });
    }
  };

  // Auth Guard Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fdfcf8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-orange-700 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "master-admin") {
    return (
      <div className="min-h-screen bg-[#fdfcf8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#e8dcc8] p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-semibold text-stone-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-stone-600 mb-6">
            This dashboard is restricted to Master Administrators. Your current role is{" "}
            <span className="font-semibold text-orange-700 uppercase">{user?.role || "guest"}</span>.
          </p>
          <button
            onClick={() => router.push(user ? "/catalog" : "/login")}
            className="w-full py-3 bg-[#873b20] text-white rounded-xl font-medium text-sm hover:bg-orange-800 transition"
          >
            {user ? "Return to Store" : "Log in as Master Admin"}
          </button>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      id: "branches",
      label: "Total Branches",
      value: stats.totalBranches || branches.length,
      change: "Active in Delhi-NCR",
      icon: Building2,
      color: "bg-purple-50 text-purple-700",
    },
    {
      id: "consultations",
      label: "Pending Consultations",
      value: stats.pendingConsultations,
      change: "Awaiting confirmation",
      icon: Clock,
      color: "bg-orange-50 text-orange-700",
    },
    {
      id: "orders",
      label: "Active Orders",
      value: stats.activeOrders,
      change: "In tailoring process",
      icon: ShoppingBag,
      color: "bg-blue-50 text-blue-700",
    },
    {
      id: "revenue",
      label: "This Month Revenue",
      value: `₹${(stats.revenueThisMonth || 0).toLocaleString("en-IN")}`,
      change: `${stats.revenueChange >= 0 ? "+" : ""}${stats.revenueChange}% vs last month`,
      icon: IndianRupee,
      color: "bg-green-50 text-green-700",
    },
    {
      id: "reviews",
      label: "Total Reviews",
      value: stats.totalReviews,
      change: "Customer feedback",
      icon: Star,
      color: "bg-amber-50 text-amber-700",
    },
  ];

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "consultation":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "order":
        return <ShoppingBag className="h-4 w-4 text-blue-500" />;
      case "user":
        return <Users className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf8]">
      {/* Header */}
      <header className="bg-white border-b border-[#e8dcc8] px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-semibold text-stone-900">
                Master Admin Dashboard
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                Manage all branches and monitor platform activity
              </p>
            </div>
            <button type="button" onClick={() => { setBranchFormError(""); setIsAddBranchOpen(true); }} className="flex items-center gap-2 bg-[#873b20] text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-orange-800 transition">
              <Plus className="h-4 w-4" />
              Add New Branch
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
        >
          {kpiCards.map((stat) => (
            <motion.div key={stat.label} variants={fadeInUp}>
              <button
                type="button"
                aria-label={`${stat.label}: ${stat.value}. ${stat.id === "branches" ? "Jump to branch list" : "Toggle details"}`}
                aria-expanded={stat.id === "branches" ? undefined : expandedKpi === stat.id}
                onClick={() => {
                  if (stat.id === "branches") {
                    document.getElementById("branches-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                  }
                  setExpandedKpi((current) => current === stat.id ? null : stat.id);
                }}
                className="group w-full rounded-2xl border border-[#e8dcc8] bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-sm text-stone-500">{stat.label}</p>
                    <p className="text-3xl font-semibold text-stone-900">{stat.value}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#f0e9dd] pt-3 text-xs font-medium text-stone-500 transition group-hover:text-orange-800">
                  <span>{stat.id === "branches" ? "View branch list" : expandedKpi === stat.id ? "Hide details" : "View details"}</span>
                  {stat.id === "branches" ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedKpi === stat.id ? "rotate-180" : ""}`} />
                  )}
                </div>
              </button>
            </motion.div>
          ))}
        </motion.div>

        {expandedKpi && expandedKpi !== "branches" && (
          <section aria-live="polite" className="mb-8 rounded-2xl border border-[#e8dcc8] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-stone-900">
                  {expandedKpi === "consultations"
                    ? "Recent consultation activity"
                    : expandedKpi === "orders"
                      ? "Recent order activity"
                      : expandedKpi === "reviews"
                        ? "Recent brand reviews"
                        : "Revenue details"}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {expandedKpi === "revenue"
                    ? "Based on paid orders recorded this month."
                    : expandedKpi === "reviews"
                      ? "Customer-submitted brand reviews."
                      : "Latest matching entries from the dashboard activity feed."}
                </p>
              </div>
              <button type="button" aria-label="Close card details" onClick={() => setExpandedKpi(null)} className="rounded-lg p-2 text-stone-500 hover:bg-[#fdfcf8] hover:text-stone-900">
                <X className="h-4 w-4" />
              </button>
            </div>
            {expandedKpi === "revenue" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#fdfcf8] p-4">
                  <p className="text-xs text-stone-500">Paid revenue this month</p>
                  <p className="mt-1 text-xl font-semibold text-stone-900">₹{(stats.revenueThisMonth || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-xl bg-[#fdfcf8] p-4">
                  <p className="text-xs text-stone-500">Compared with last month</p>
                  <p className="mt-1 text-xl font-semibold text-stone-900">{stats.revenueChange >= 0 ? "+" : ""}{stats.revenueChange}%</p>
                </div>
              </div>
            ) : expandedKpi === "reviews" ? (
              <div className="divide-y divide-[#eee5d7]">
                {reviews.length > 0 ? (
                  reviews.slice(0, 5).map((review) => (
                    <div key={review._id} className="flex w-full flex-col gap-1 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`h-3.5 w-3.5 ${n <= review.rating ? "fill-amber-500 text-amber-500" : "text-stone-300"}`}
                            />
                          ))}
                          <span className="ml-1 text-xs text-stone-500">{review.rating}</span>
                        </div>
                        <p className="text-sm text-stone-900">{review.comment}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{review.customer.name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-sm text-stone-500">No reviews have been submitted yet.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#eee5d7]">
                {activities.filter((activity) => activity.type === (expandedKpi === "consultations" ? "consultation" : "order")).length ? (
                  activities
                    .filter((activity) => activity.type === (expandedKpi === "consultations" ? "consultation" : "order"))
                    .slice(0, 5)
                    .map((activity) => (
                      <button
                        key={`${activity.type}-${activity.id}`}
                        type="button"
                        onClick={() => openActivityDetails(activity)}
                        className="flex w-full flex-col gap-1 py-3 text-left transition hover:bg-[#fffaf1] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-stone-800">{activity.message}</p>
                          {activity.branch && <p className="mt-0.5 text-xs text-stone-500">{activity.branch}</p>}
                        </div>
                        {activity.status && <span className="w-fit rounded-full bg-[#f7f1e6] px-2.5 py-1 text-xs capitalize text-stone-600">{activity.status.replace(/[-_]/g, " ")}</span>}
                      </button>
                    ))
                ) : (
                  <p className="py-4 text-sm text-stone-500">No matching entries are available in the recent activity feed.</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Branches Table */}
          <motion.div
            id="branches-table"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 bg-white rounded-2xl border border-[#e8dcc8] shadow-sm"
          >
            <div className="px-6 py-5 border-b border-[#e8dcc8] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">
                All Branches
              </h2>
              <span className="text-sm text-stone-500">
                {branches.length} locations
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#fdfcf8]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8dcc8]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                        Loading branches...
                      </td>
                    </tr>
                  ) : branches.length > 0 ? (
                    branches.map((branch) => (
                      <tr key={branch._id} className="hover:bg-[#fdfcf8] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <Building2 className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-stone-900">{branch.name}</p>
                              <p className="text-xs text-stone-500">{branch.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-stone-600">
                            <MapPin className="h-4 w-4 text-stone-400" />
                            {branch.address.city}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {branch.manager ? (
                            <div>
                              <p className="text-sm font-medium text-stone-900">
                                {branch.manager.name}
                              </p>
                              <p className="text-xs text-stone-500">{branch.manager.email}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-stone-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                        No branches found. Add your first branch to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recent Activity Sidebar */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl border border-[#e8dcc8] shadow-sm"
          >
            <div className="px-6 py-5 border-b border-[#e8dcc8]">
              <h2 className="text-lg font-semibold text-stone-900">
                Recent Activity
              </h2>
            </div>
            <div className="p-4 space-y-1">
              {loading ? (
                <div className="py-8 text-center text-stone-500">Loading activity...</div>
              ) : activities.length > 0 ? (
                activities.map((activity) => activity.type === "consultation" || activity.type === "order" ? (
                  <motion.button
                    key={activity.id}
                    type="button"
                    variants={fadeInUp}
                    onClick={() => openActivityDetails(activity)}
                    aria-label={`View details: ${activity.message}`}
                    className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[#fdfcf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                  >
                    <div className="rounded-lg bg-stone-50 p-2">{getActivityIcon(activity.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-stone-900">{activity.message}</p>
                      {activity.branch && <span className="mt-1 block text-xs text-stone-500">{activity.branch}</span>}
                    </div>
                    <Eye className="mt-1 h-4 w-4 shrink-0 text-stone-400" />
                  </motion.button>
                ) : null)
              ) : (
                <div className="py-8 text-center text-stone-500">No recent activity</div>
              )}
            </div>
            <div className="px-4 pb-4">
              <button className="w-full py-2.5 text-sm text-stone-600 hover:text-stone-900 transition border border-[#e8dcc8] rounded-xl hover:bg-[#fdfcf8]">
                View All Activity
              </button>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mt-8 bg-gradient-to-r from-[#873b20] to-orange-700 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Quick Actions</h3>
              <p className="text-orange-100 text-sm mt-1">
                Common administrative tasks
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push("/admin/consultations")} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition">
                View All Consultations
              </button>
              <button onClick={() => router.push("/admin/orders")} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition">
                View All Orders
              </button>
              <button onClick={() => router.push("/admin/users")} className="px-4 py-2.5 bg-white text-[#873b20] rounded-xl text-sm font-medium hover:bg-orange-50 transition">
                Manage Users
              </button>
              <button onClick={() => router.push("/admin/reviews")} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition">
                View All Reviews
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {isAddBranchOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-stone-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !branchSubmitting) setIsAddBranchOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="add-branch-title" className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#e8dcc8] bg-[#fffdf8] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e8dcc8] bg-[#fffdf8]/95 px-6 py-5 backdrop-blur">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-800">Branch management</p>
                <h2 id="add-branch-title" className="mt-1 font-serif text-2xl text-stone-900">Add New Branch</h2>
                <p className="mt-1 text-sm text-stone-500">Add the branch address; its map location will be found automatically.</p>
              </div>
              <button type="button" aria-label="Close add branch form" disabled={branchSubmitting} onClick={() => setIsAddBranchOpen(false)} className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitNewBranch} className="space-y-5 p-6 sm:p-8">
              {branchFormError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{branchFormError}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["name", "Branch name", "e.g. South Delhi Atelier"],
                  ["code", "Branch code", "e.g. south-delhi"],
                  ["phone", "Phone", "+91 98765 43210"],
                  ["street", "Street address", "House / street / area"],
                  ["city", "City", "New Delhi"],
                  ["state", "State", "Delhi"],
                  ["pincode", "PIN code", "110001"],
                ] as const).map(([field, label, placeholder]) => (
                  <label key={field} className={field === "street" ? "sm:col-span-2" : ""}>
                    <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
                    <input required value={branchForm[field]} onChange={(event) => updateBranchField(field, event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#e8dcc8] bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-700 focus:ring-2 focus:ring-orange-100" />
                  </label>
                ))}
              </div>
              <p className="text-xs text-stone-500">Map location is looked up from this address using <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-orange-800 underline">© OpenStreetMap contributors</a>. Use a complete, recognizable address.</p>
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#eee5d7] pt-5 sm:flex-row">
                <button type="button" disabled={branchSubmitting} onClick={() => setIsAddBranchOpen(false)} className="rounded-xl border border-[#e8dcc8] px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-white disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={branchSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#873b20] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {branchSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  {branchSubmitting ? "Finding location and creating..." : "Create branch"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <AdminRecordDetailsDialog target={selectedActivityTarget} onClose={() => setSelectedActivityTarget(null)} />
    </div>
  );
}
