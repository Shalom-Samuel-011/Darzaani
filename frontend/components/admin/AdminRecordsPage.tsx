"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import StyledFilterDropdown from "@/components/admin/StyledFilterDropdown";
import AdminRecordDetailsDialog, { type AdminRecordTarget } from "@/components/admin/AdminRecordDetailsDialog";

type Kind = "consultation" | "order";
interface Branch { _id: string; name: string; code: string }
interface RecordRow {
  _id: string; name?: string; email?: string; phone?: string; garmentInterest?: string;
  preferredDate?: string; preferredTime?: string; branch?: Branch | null; consultationType?: string;
  status: string; paymentStatus?: string; customer?: string | { name: string; email?: string };
  assignedTailor?: string | { name: string } | null; items?: unknown[]; totalAmount?: number; createdAt: string;
}
const consultationStatuses = ["requested", "confirmed", "completed", "cancelled"];
const orderStatuses = ["payment_pending", "order_placed", "assigned_to_tailor", "cutting", "stitching", "trial_ready", "completed", "dispatched", "delivered", "cancelled"];
const paymentStatuses = ["pending", "authorized", "partially_paid", "paid", "failed", "refunded"];
const label = (value: string) => value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "\u2014";

export default function AdminRecordsPage({ kind }: { kind: Kind }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isOrders = kind === "order";
  const title = isOrders ? "Orders" : "Consultations";
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [extraFilter, setExtraFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<AdminRecordTarget | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push(`/login?redirect=/admin/${isOrders ? "orders" : "consultations"}`); return; }
    if (user.role !== "master-admin") return;
    API.get("/branches").then((res) => setBranches(res.data.data?.branches || [])).catch(() => setBranches([]));
  }, [authLoading, user, router, isOrders]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (authLoading || user?.role !== "master-admin") return;
    let current = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const response = await API.get(`/admin/${isOrders ? "orders" : "consultations"}`, {
          params: { page, limit: 10, ...(query ? { search: query } : {}), ...(status !== "all" ? { status } : {}),
            ...(!isOrders && extraFilter !== "all" ? { branch: extraFilter } : {}),
            ...(isOrders && extraFilter !== "all" ? { paymentStatus: extraFilter } : {}),
            ...(isOrders && branchFilter !== "all" ? { branch: branchFilter } : {}) },
        });
        if (!current) return;
        setRows(response.data.data?.[isOrders ? "orders" : "consultations"] || []);
        setTotal(response.data.results || 0); setPages(response.data.pages || 0);
      } catch (err) {
        if (!current) return;
        const apiError = err as { response?: { data?: { message?: string } } };
        setError(apiError.response?.data?.message || `Could not load ${title.toLowerCase()}. Please try again.`);
      } finally { if (current) setLoading(false); }
    };
    void load();
    return () => { current = false; };
  }, [authLoading, user, isOrders, page, query, status, extraFilter, branchFilter, retry, title]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#fdfcf8] text-sm text-stone-500">Verifying admin credentials...</div>;
  if (!user || user.role !== "master-admin") return <div className="flex min-h-[70vh] items-center justify-center bg-[#fdfcf8] p-6"><div className="rounded-3xl border border-[#e8dcc8] bg-white p-8 text-center"><h1 className="font-serif text-2xl">Access restricted</h1><p className="mt-3 text-sm text-stone-600">{title} are available to Master Administrators only.</p><Link href={user ? "/admin" : "/login"} className="mt-5 inline-block text-orange-800">Return to admin</Link></div></div>;

  const statuses = isOrders ? orderStatuses : consultationStatuses;
  return <div className="min-h-screen bg-[#fdfcf8] px-5 py-8 text-stone-900 sm:px-8"><main className="mx-auto max-w-7xl">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin" className="text-sm font-medium text-orange-800 hover:underline">{"\u2190"} Admin dashboard</Link><h1 className="mt-3 font-serif text-3xl font-semibold">{title}</h1><p className="mt-1 text-sm text-stone-500">Search, filter, and review {title.toLowerCase()} across all branches.</p></div><span className="text-sm text-stone-500">{total} {total === 1 ? "record" : "records"}</span></div>
    <section className="overflow-visible rounded-2xl border border-[#e8dcc8] bg-white shadow-sm"><div className={`grid gap-3 rounded-t-2xl border-b border-[#eee5d7] bg-[#fffdf8] p-4 sm:grid-cols-2 ${isOrders ? "lg:grid-cols-[minmax(220px,1fr)_170px_190px_190px]" : "lg:grid-cols-[minmax(220px,1fr)_200px_220px]"}`}>
      <label className="flex items-center gap-2 rounded-xl border border-[#e8dcc8] bg-white px-3.5 py-2.5 text-stone-500"><Search className="h-4 w-4 shrink-0"/><span className="sr-only">Search {title}</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isOrders ? "Search order ID or customer" : "Search name, email, phone"} className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"/></label>
      <StyledFilterDropdown label={`Filter ${title.toLowerCase()} by status`} value={status} options={[{ value: "all", label: "All statuses" }, ...statuses.map((s) => ({ value: s, label: label(s) }))]} onChange={(v) => { setStatus(v); setPage(1); }}/>
      <StyledFilterDropdown label={isOrders ? "Filter by payment status" : "Filter by branch"} value={extraFilter} options={[{ value: "all", label: isOrders ? "All payment statuses" : "All branches" }, ...(isOrders ? paymentStatuses.map((s) => ({ value: s, label: label(s) })) : branches.map((b) => ({ value: b._id, label: b.name })))]} onChange={(v) => { setExtraFilter(v); setPage(1); }}/>
      {isOrders && <StyledFilterDropdown label="Filter by branch" value={branchFilter} options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch._id, label: branch.name }))]} onChange={(value) => { setBranchFilter(value); setPage(1); }}/>}
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[920px]"><thead className="bg-[#fdfcf8]"><tr>{(isOrders ? ["Order", "Customer", "Items", "Tailor", "Branch", "Status", "Payment", "Total", "Created"] : ["Customer", "Contact", "Interested in", "Appointment", "Branch", "Status", "Requested"]).map((h) => <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#eee5d7]">
      {loading ? <tr><td colSpan={isOrders ? 9 : 7} className="px-6 py-12 text-center text-sm text-stone-500">Loading {title.toLowerCase()}...</td></tr> : error ? <tr><td colSpan={isOrders ? 9 : 7} className="px-6 py-10 text-center"><p role="alert" className="text-sm text-red-700">{error}</p><button onClick={() => setRetry((n) => n + 1)} className="mt-3 rounded-lg border border-[#e8dcc8] px-4 py-2 text-sm">Try again</button></td></tr> : rows.length ? rows.map((row) => {
        const customer = typeof row.customer === "object" ? row.customer : null;
        const tailor = typeof row.assignedTailor === "object" ? row.assignedTailor : null;
        return <tr key={row._id} className="cursor-pointer transition-colors hover:bg-[#fdfcf8]" onClick={() => setSelected({ kind, id: row._id })}>
          {isOrders ? <><td className="px-5 py-4 text-sm font-semibold text-orange-900">#{row._id.slice(-6).toUpperCase()}</td><td className="px-5 py-4 text-sm text-stone-800">{customer?.name || "Customer"}<span className="block text-xs text-stone-500">{customer?.email || ""}</span></td><td className="px-5 py-4 text-sm text-stone-600">{row.items?.length || 0}</td><td className="px-5 py-4 text-sm text-stone-600">{tailor?.name || "Unassigned"}</td><td className="px-5 py-4 text-sm text-stone-600">{row.branch?.name || "Unassigned"}</td><td className="px-5 py-4 text-sm capitalize">{label(row.status)}</td><td className="px-5 py-4 text-sm capitalize">{label(row.paymentStatus || "pending")}</td><td className="px-5 py-4 text-sm">{"\u20B9"}{(row.totalAmount || 0).toLocaleString("en-IN")}</td><td className="px-5 py-4 text-sm text-stone-600">{formatDate(row.createdAt)}</td></> : <><td className="px-5 py-4 text-sm font-medium">{row.name}</td><td className="px-5 py-4 text-sm text-stone-600">{row.email}<span className="block">{row.phone}</span></td><td className="px-5 py-4 text-sm text-stone-600">{row.garmentInterest}</td><td className="px-5 py-4 text-sm text-stone-600">{formatDate(row.preferredDate)}<span className="block">{row.preferredTime}</span></td><td className="px-5 py-4 text-sm text-stone-600">{row.branch?.name || "Unassigned"}</td><td className="px-5 py-4 text-sm capitalize">{label(row.status)}</td><td className="px-5 py-4 text-sm text-stone-600">{formatDate(row.createdAt)}</td></>}
        </tr>;
      }) : <tr><td colSpan={isOrders ? 9 : 7} className="px-6 py-12 text-center text-sm text-stone-500">No {title.toLowerCase()} match these filters.</td></tr>}
    </tbody></table></div>
    {!loading && !error && pages > 1 && <div className="flex items-center justify-between border-t border-[#eee5d7] px-5 py-3"><p className="text-xs text-stone-500">Page {page} of {pages} Â· 10 records per page</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#e8dcc8] px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Previous</button><button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#e8dcc8] px-3 py-2 text-sm disabled:opacity-40">Next<ChevronRight className="h-4 w-4"/></button></div></div>}
    </section>
  </main><AdminRecordDetailsDialog target={selected} onClose={() => setSelected(null)}/></div>;
}


