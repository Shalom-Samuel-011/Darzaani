"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Hammer, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import StyledFilterDropdown from "@/components/admin/StyledFilterDropdown";
import AdminActionDropdown from "@/components/admin/AdminActionDropdown";
import AdminRecordDetailsDialog, { type AdminRecordTarget } from "@/components/admin/AdminRecordDetailsDialog";

interface TailorOrder {
  _id: string;
  customer?: { name: string } | string;
  items: { garment?: { name: string } | string; quantity: number }[];
  status: string;
  estimatedCompletionDate?: string;
  createdAt: string;
}

const productionSteps: Record<string, string[]> = {
  assigned_to_tailor: ["cutting"],
  cutting: ["stitching"],
  stitching: ["trial_ready"],
};
const statuses = ["assigned_to_tailor", "cutting", "stitching", "trial_ready", "completed"];
const titleCase = (value: string) => value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });

export default function TailorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<TailorOrder[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [recordTarget, setRecordTarget] = useState<AdminRecordTarget | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login?redirect=/tailor"); return; }
    if (user.role !== "tailor") {
      router.replace(user.role === "branch-manager" ? "/manager" : user.role === "master-admin" ? "/admin" : "/catalog");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (authLoading || user?.role !== "tailor") return;
    let current = true;
    API.get("/order/my-assigned", { params: { page, limit: 10, status, ...(search ? { search } : {}) } })
      .then((response) => {
        if (!current) return;
        setOrders(response.data.data?.orders || []);
        setPages(response.data.pages || 0);
        setTotal(response.data.results || 0);
        setError("");
      })
      .catch((requestError) => {
        if (!current) return;
        const apiError = requestError as { response?: { data?: { message?: string } } };
        setError(apiError.response?.data?.message || "Could not load your assigned work.");
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [authLoading, user, page, status, search, retry]);

  const updateStage = async (orderId: string, nextStatus: string) => {
    setSavingId(orderId); setError(""); setNotice("");
    try {
      await API.patch(`/order/${orderId}/status`, { status: nextStatus });
      setOrders((current) => current.map((order) => order._id === orderId ? { ...order, status: nextStatus } : order));
      setNotice(`Order #${orderId.slice(-6).toUpperCase()} moved to ${titleCase(nextStatus)}.`);
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || "Could not update this production stage.");
    } finally { setSavingId(""); }
  };

  if (authLoading || !user || user.role !== "tailor") {
    return <div className="flex min-h-[70vh] items-center justify-center bg-[#fdfcf8] text-sm text-stone-500">Opening your tailor workspace...</div>;
  }

  return <div className="min-h-screen bg-[#fdfcf8] text-stone-900">
    <header className="border-b border-[#e8dcc8] bg-white px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-800">Tailor workspace</p><h1 className="mt-1 font-serif text-3xl font-medium sm:text-4xl">Your assigned work</h1><p className="mt-2 text-sm text-stone-500">Orders assigned to you, with the details and production stages you need.</p></div>
      <div className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf8] px-5 py-3"><p className="text-xs text-stone-500">Matching assigned orders</p><p className="mt-1 text-2xl font-semibold">{total}</p></div>
    </div></header>
    <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
      {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }} className="font-semibold">Try again</button></div>}
      {notice && <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
      <section className="overflow-visible rounded-2xl border border-[#e8dcc8] bg-white shadow-sm">
        <div className="relative z-10 grid gap-3 rounded-t-2xl border-b border-[#eee5d7] bg-[#fffdf8] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(230px,1fr)_240px]">
          <label className="flex items-center gap-2 rounded-xl border border-[#e8dcc8] bg-white px-3.5 py-2.5 text-stone-500"><Search className="h-4 w-4"/><span className="sr-only">Search assigned work</span><input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setLoading(true); setError(""); }} placeholder="Search order number or garment" className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"/></label>
          <StyledFilterDropdown label="Filter assigned work by stage" value={status} options={[{ value: "all", label: "All production stages" }, ...statuses.map((value) => ({ value, label: titleCase(value) }))]} onChange={(value) => { setStatus(value); setPage(1); setLoading(true); setError(""); }}/>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead className="bg-[#fdfcf8]"><tr>{["Order", "Customer", "Assigned pieces", "Production stage", "Due date", ""].map((heading, index) => <th key={`${heading}-${index}`} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#eee5d7]">{loading ? <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-stone-500">Loading your assigned orders...</td></tr> : orders.length ? orders.map((order) => {
            const nextStages = productionSteps[order.status] || [];
            const customerName = typeof order.customer === "object" ? order.customer?.name : "Customer";
            const pieceNames = order.items.map((item) => `${typeof item.garment === "object" ? item.garment.name : "Garment"}${item.quantity > 1 ? ` Ã—${item.quantity}` : ""}`).join(", ");
            return <tr key={order._id}>
              <td className="px-4 py-4 text-sm font-semibold text-orange-900">#{order._id.slice(-6).toUpperCase()}</td>
              <td className="px-4 py-4 text-sm">{customerName || "Customer"}</td>
              <td className="max-w-xs px-4 py-4 text-sm text-stone-600">{pieceNames}</td>
              <td className="px-4 py-4"><div className="flex min-w-40 flex-col items-start gap-2"><span className="rounded-full bg-[#f7f1e6] px-2.5 py-1 text-xs font-medium text-stone-700">{titleCase(order.status)}</span><AdminActionDropdown label={`Update stage for order ${order._id.slice(-6)}`} disabled={savingId === order._id || !nextStages.length} value="" placeholder={nextStages.length ? `Move to ${titleCase(nextStages[0])}` : order.status === "trial_ready" ? "Awaiting manager review" : "No stage update"} options={nextStages.map((value) => ({ value, label: titleCase(value) }))} onChange={(value) => void updateStage(order._id, value)}/></div></td>
              <td className="px-4 py-4 text-sm text-stone-600">{order.estimatedCompletionDate ? formatDate(order.estimatedCompletionDate) : "Not set"}</td>
              <td className="px-4 py-4"><button type="button" aria-label={`View order ${order._id.slice(-6)} details`} onClick={() => setRecordTarget({ kind: "order", id: order._id })} className="rounded-lg p-2 text-stone-500 hover:bg-[#fdfcf8]"><Eye className="h-4 w-4"/></button></td>
            </tr>;
          }) : <tr><td colSpan={6} className="px-6 py-14 text-center"><Hammer className="mx-auto h-7 w-7 text-stone-400"/><p className="mt-3 text-sm font-medium text-stone-700">No assigned orders match these filters.</p><p className="mt-1 text-xs text-stone-500">New work appears here after your branch manager assigns it to you.</p></td></tr>}</tbody>
        </table></div>
        {!loading && pages > 1 && <div className="flex items-center justify-between border-t border-[#eee5d7] px-5 py-3"><p className="text-xs text-stone-500">{total} orders Â· Page {page} of {pages}</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => { setPage((value) => value - 1); setLoading(true); }} className="inline-flex items-center gap-1 rounded-lg border border-[#e8dcc8] px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Previous</button><button disabled={page >= pages} onClick={() => { setPage((value) => value + 1); setLoading(true); }} className="inline-flex items-center gap-1 rounded-lg border border-[#e8dcc8] px-3 py-2 text-sm disabled:opacity-40">Next<ChevronRight className="h-4 w-4"/></button></div></div>}
      </section>
    </main>
    <AdminRecordDetailsDialog target={recordTarget} onClose={() => setRecordTarget(null)} orderEndpoint="/order"/>
  </div>;
}

