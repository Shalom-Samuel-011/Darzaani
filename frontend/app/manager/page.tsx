"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Search, Users, Eye, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import StyledFilterDropdown from "@/components/admin/StyledFilterDropdown";
import AdminActionDropdown from "@/components/admin/AdminActionDropdown";
import AdminRecordDetailsDialog, { type AdminRecordTarget } from "@/components/admin/AdminRecordDetailsDialog";

type Section = "overview" | "orders" | "consultations" | "tailors";
interface Branch { _id: string; name: string; code: string; phone: string; address: { street: string; city: string; state: string; pincode: string } }
interface ManagerStats { activeOrders: number; unassignedOrders: number; readyForReview: number; requestedConsultations: number; upcomingConsultations: number; tailors: number }
interface ManagerOrder { _id: string; customer: { name: string; email: string; phone?: string }; assignedTailor?: { _id: string; name: string } | null; items: { garment?: { name: string } }[]; status: string; paymentStatus: string; totalAmount: number; createdAt: string }
interface ManagerConsultation { _id: string; name: string; email: string; phone: string; garmentInterest: string; preferredDate: string; preferredTime: string; consultationType: string; status: string; createdAt: string }
interface ManagerTailor { _id: string; name: string; email: string; phone?: string; activeOrders: number }

const orderStatuses = ["payment_pending", "order_placed", "assigned_to_tailor", "cutting", "stitching", "trial_ready", "completed", "dispatched", "delivered", "cancelled"];
const nextOrderStatuses: Record<string, string[]> = {
  assigned_to_tailor: ["cutting"], cutting: ["stitching"], stitching: ["trial_ready"],
  trial_ready: ["stitching", "completed"], completed: ["dispatched"], dispatched: ["delivered"],
};
const orderActionLabels: Record<string, string> = {
  stitching: "Send back for alterations",
  completed: "Mark order completed",
};
const consultationStatuses = ["requested", "confirmed", "completed", "cancelled"];
const label = (value: string) => value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });

function Metric({ title, value, note, icon: Icon, onClick }: { title: string; value: number; note: string; icon: typeof Building2; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl border border-[#e8dcc8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
    <span className="flex items-center justify-between"><span className="text-sm text-stone-500">{title}</span><span className="rounded-xl bg-orange-50 p-2.5 text-orange-800"><Icon className="h-5 w-5"/></span></span>
    <span className="mt-3 block text-3xl font-semibold text-stone-900">{value}</span><span className="mt-1 block text-xs text-stone-500">{note}</span>
  </button>;
}

export default function BranchManagerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>("overview");
  const [branch, setBranch] = useState<Branch | null>(null);
  const [stats, setStats] = useState<ManagerStats>({ activeOrders: 0, unassignedOrders: 0, readyForReview: 0, requestedConsultations: 0, upcomingConsultations: 0, tailors: 0 });
  const [recentOrders, setRecentOrders] = useState<ManagerOrder[]>([]);
  const [recentConsultations, setRecentConsultations] = useState<ManagerConsultation[]>([]);
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [consultations, setConsultations] = useState<ManagerConsultation[]>([]);
  const [tailors, setTailors] = useState<ManagerTailor[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [tailor, setTailor] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [recordTarget, setRecordTarget] = useState<AdminRecordTarget | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login?redirect=/manager"); return; }
    if (user.role !== "branch-manager") return;
    API.get("/manager/dashboard").then((response) => {
      const data = response.data.data;
      setBranch(data.branch);
      setStats(data.stats);
      setRecentOrders(data.recentOrders || []);
      setRecentConsultations(data.recentConsultations || []);
    }).catch((err) => {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || "Could not load your branch dashboard.");
    }).finally(() => setDashboardLoading(false));
    API.get("/manager/tailors").then((response) => setTailors(response.data.data?.tailors || [])).catch(() => setTailors([]));
  }, [authLoading, user, router, retry]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (authLoading || user?.role !== "branch-manager" || !["orders", "consultations"].includes(section)) return;
    let current = true;
    const isOrders = section === "orders";
    const params = { page, limit: 10, ...(query ? { search: query } : {}), ...(status !== "all" ? { status } : {}), ...(isOrders && tailor !== "all" ? { tailor } : {}) };
    API.get(`/manager/${section}`, { params }).then((response) => {
      if (!current) return;
      const payload = response.data;
    if (isOrders) setOrders(payload.data?.orders || []); else setConsultations(payload.data?.consultations || []);
      setTotal(payload.results || 0); setPages(payload.pages || 0);
    }).catch((err) => {
      if (!current) return;
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || `Could not load ${section}.`);
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [authLoading, user, section, page, query, status, tailor, retry]);

  const changeSection = (next: Section) => { setSection(next); setPage(1); setStatus("all"); setTailor("all"); setSearch(""); setQuery(""); setLoading(true); setError(""); setNotice(""); };

  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    setSavingId(orderId); setNotice(""); setError("");
    try {
      await API.patch(`/manager/orders/${orderId}/status`, { status: nextStatus });
      setOrders((current) => current.map((order) => order._id === orderId ? { ...order, status: nextStatus } : order));
      setRecentOrders((current) => current.map((order) => order._id === orderId ? { ...order, status: nextStatus } : order));
      setNotice("Order status updated.");
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || "Could not update this order.");
    } finally { setSavingId(""); }
  };

  const assignTailor = async (orderId: string, tailorId: string) => {
    setSavingId(orderId); setNotice(""); setError("");
    try {
      await API.patch(`/manager/orders/${orderId}/assign-tailor`, { tailorId });
      setOrders((current) => current.map((order) => order._id === orderId ? { ...order, assignedTailor: tailors.find((person) => person._id === tailorId) || null, status: order.status === "order_placed" ? "assigned_to_tailor" : order.status } : order));
      setNotice("Tailor assignment updated.");
      setLoading(true); setDashboardLoading(true);
      setRetry((value) => value + 1);
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || "Could not assign this tailor.");
    } finally { setSavingId(""); }
  };

  const updateConsultationStatus = async (id: string, nextStatus: string) => {
    setSavingId(id); setNotice(""); setError("");
    try {
      await API.patch(`/manager/consultations/${id}/status`, { status: nextStatus });
      setConsultations((current) => current.map((item) => item._id === id ? { ...item, status: nextStatus } : item));
      setRecentConsultations((current) => current.map((item) => item._id === id ? { ...item, status: nextStatus } : item));
      setNotice("Consultation status updated.");
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || "Could not update this consultation.");
    } finally { setSavingId(""); }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#fdfcf8] text-sm text-stone-500">Verifying branch manager access...</div>;
  if (!user || user.role !== "branch-manager") return <div className="flex min-h-[70vh] items-center justify-center bg-[#fdfcf8] p-6"><section className="rounded-3xl border border-[#e8dcc8] bg-white p-8 text-center"><h1 className="font-serif text-2xl text-stone-900">Branch manager access only</h1><p className="mt-2 text-sm text-stone-600">This workspace is available to branch managers.</p><Link href={user?.role === "master-admin" ? "/admin" : "/catalog"} className="mt-5 inline-flex text-sm font-medium text-orange-800">Return</Link></section></div>;

  const nav: { id: Section; label: string }[] = [{ id: "overview", label: "Overview" }, { id: "orders", label: "Orders" }, { id: "consultations", label: "Consultations" }, { id: "tailors", label: "Tailors" }];
  const isList = section === "orders" || section === "consultations";
  const statuses = section === "orders" ? orderStatuses : consultationStatuses;

  return <div className="min-h-screen bg-[#fdfcf8] text-stone-900">
    <header className="border-b border-[#e8dcc8] bg-white px-5 py-5 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-800">Branch operations</p><h1 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">{branch?.name || "Manager workspace"}</h1><p className="mt-1 text-sm text-stone-500">{branch ? `${branch.address.city}, ${branch.address.state} Â· ${branch.code}` : "Your assigned branch workspace"}</p></div>
      {branch && <a href={`tel:${branch.phone}`} className="rounded-full border border-[#e8dcc8] px-4 py-2 text-sm font-medium text-stone-700 hover:bg-[#fdfcf8]">Branch contact: {branch.phone}</a>}
    </div></header>
    <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
      <nav aria-label="Branch manager sections" className="mb-7 flex gap-2 overflow-x-auto border-b border-[#e8dcc8] pb-2">{nav.map((item) => <button key={item.id} onClick={() => changeSection(item.id)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${section === item.id ? "bg-[#873b20] text-white" : "text-stone-600 hover:bg-white hover:text-stone-900"}`}>{item.label}</button>)}</nav>

      {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setDashboardLoading(true); setError(""); setRetry((value) => value + 1); }} className="inline-flex items-center gap-1 font-semibold"><RefreshCw className="h-3.5 w-3.5"/>Retry</button></div>}
      {notice && <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}

      {section === "overview" && <>
        {dashboardLoading && !branch ? <div className="rounded-2xl border border-[#e8dcc8] bg-white p-10 text-center text-sm text-stone-500">Loading your branch...</div> : <>
          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric title="Active orders" value={stats.activeOrders} note="Currently in the production pipeline" icon={ClipboardList} onClick={() => changeSection("orders")}/>
            <Metric title="Need a tailor" value={stats.unassignedOrders} note="Paid orders awaiting assignment" icon={Users} onClick={() => { changeSection("orders"); setTailor("unassigned"); }}/>
            <Metric title="Ready for review" value={stats.readyForReview} note="Tailoring finished; manager review needed" icon={ClipboardList} onClick={() => { changeSection("orders"); setStatus("trial_ready"); }}/>
            <Metric title="New consultations" value={stats.requestedConsultations} note="Requests that need a response" icon={CalendarDays} onClick={() => changeSection("consultations")}/>
            <Metric title="Upcoming consultations" value={stats.upcomingConsultations} note="Requested or confirmed appointments" icon={CalendarDays} onClick={() => changeSection("consultations")}/>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#e8dcc8] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#eee5d7] px-5 py-4"><div><h2 className="font-semibold">Recent orders</h2><p className="mt-0.5 text-xs text-stone-500">Latest orders for this atelier</p></div><button onClick={() => changeSection("orders")} className="text-sm font-medium text-orange-800 hover:underline">All orders</button></div>
              {recentOrders.length ? <div className="divide-y divide-[#eee5d7]">{recentOrders.map((order) => <div key={order._id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="text-sm font-medium">{order.customer?.name || "Customer"} <span className="text-xs text-stone-500">Â· #{order._id.slice(-6).toUpperCase()}</span></p><p className="mt-1 text-xs capitalize text-stone-500">{label(order.status)} Â· {formatDate(order.createdAt)}</p></div><button aria-label="Open order details" onClick={() => setRecordTarget({ kind: "order", id: order._id })} className="rounded-lg p-2 text-stone-500 hover:bg-[#fdfcf8]"><Eye className="h-4 w-4"/></button></div>)}</div> : <p className="px-5 py-8 text-sm text-stone-500">No orders assigned to this branch yet.</p>}
            </section>
            <section className="rounded-2xl border border-[#e8dcc8] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#eee5d7] px-5 py-4"><div><h2 className="font-semibold">Upcoming consultations</h2><p className="mt-0.5 text-xs text-stone-500">Appointments connected to this atelier</p></div><button onClick={() => changeSection("consultations")} className="text-sm font-medium text-orange-800 hover:underline">All consultations</button></div>
              {recentConsultations.length ? <div className="divide-y divide-[#eee5d7]">{recentConsultations.map((item) => <div key={item._id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-stone-500">{formatDate(item.preferredDate)} Â· {item.preferredTime} Â· {item.garmentInterest}</p></div><button aria-label="Open consultation details" onClick={() => setRecordTarget({ kind: "consultation", id: item._id })} className="rounded-lg p-2 text-stone-500 hover:bg-[#fdfcf8]"><Eye className="h-4 w-4"/></button></div>)}</div> : <p className="px-5 py-8 text-sm text-stone-500">No consultations are scheduled.</p>}
            </section>
          </div>
        </>}
      </>}

      {isList && <section className="overflow-visible rounded-2xl border border-[#e8dcc8] bg-white shadow-sm">
        <div className={`grid gap-3 rounded-t-2xl border-b border-[#eee5d7] bg-[#fffdf8] p-4 sm:grid-cols-2 ${section === "orders" ? "lg:grid-cols-[minmax(230px,1fr)_220px_220px]" : "lg:grid-cols-[minmax(230px,1fr)_220px]"}`}>
          <label className="flex items-center gap-2 rounded-xl border border-[#e8dcc8] bg-white px-3.5 py-2.5 text-stone-500"><Search className="h-4 w-4"/><span className="sr-only">Search {section}</span><input value={search} onChange={(event) => { setSearch(event.target.value); setLoading(true); setError(""); setNotice(""); }} placeholder={section === "orders" ? "Search order or customer" : "Search name, email, phone"} className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"/></label>
          <StyledFilterDropdown label={`Filter ${section} by status`} value={status} options={[{ value: "all", label: "All statuses" }, ...statuses.map((value) => ({ value, label: label(value) }))]} onChange={(value) => { setStatus(value); setPage(1); setLoading(true); setError(""); setNotice(""); }}/>
          {section === "orders" && <StyledFilterDropdown label="Filter orders by tailor" value={tailor} options={[{ value: "all", label: "All tailor assignments" }, { value: "unassigned", label: "Ready for tailor" }, ...tailors.map((person) => ({ value: person._id, label: person.name }))]} onChange={(value) => { setTailor(value); setPage(1); setLoading(true); setError(""); setNotice(""); }}/>} 
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px]"><thead className="bg-[#fdfcf8]"><tr>{(section === "orders" ? ["Order", "Customer", "Items", "Tailor", "Production status", "Payment", "Total", ""] : ["Customer", "Contact", "Interest", "Appointment", "Status", ""]).map((heading, index) => <th key={`${heading}-${index}`} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#eee5d7]">
            {loading ? <tr><td colSpan={section === "orders" ? 8 : 6} className="px-6 py-12 text-center text-sm text-stone-500">Loading {section}...</td></tr> : section === "orders" ? orders.length ? orders.map((order) => <tr key={order._id}>
              <td className="px-4 py-4 text-sm font-semibold text-orange-900">#{order._id.slice(-6).toUpperCase()}</td><td className="px-4 py-4 text-sm">{order.customer?.name}<span className="block text-xs text-stone-500">{order.customer?.email}</span></td><td className="px-4 py-4 text-sm text-stone-600">{order.items?.length || 0}</td>
              <td className="px-4 py-4"><AdminActionDropdown label={`${order.assignedTailor ? "Change" : "Assign"} tailor for order ${order._id.slice(-6)}`} value={order.assignedTailor?._id || ""} placeholder={order.paymentStatus !== "paid" ? "Awaiting payment" : order.assignedTailor?.name || "Assign tailor"} disabled={savingId === order._id || order.paymentStatus !== "paid" || !["order_placed", "assigned_to_tailor", "cutting", "stitching", "trial_ready"].includes(order.status) || !tailors.length} options={tailors.map((person) => ({ value: person._id, label: person.name }))} onChange={(tailorId) => void assignTailor(order._id, tailorId)} /></td>
              <td className="px-4 py-4"><div className="flex min-w-40 flex-col items-start gap-2"><span className="rounded-full bg-[#f7f1e6] px-2.5 py-1 text-xs font-medium capitalize text-stone-700">{label(order.status)}</span><AdminActionDropdown label={`Choose next step for order ${order._id.slice(-6)}`} disabled={savingId === order._id || order.paymentStatus !== "paid" || !nextOrderStatuses[order.status]?.length} value="" placeholder={nextOrderStatuses[order.status]?.length ? nextOrderStatuses[order.status].length > 1 ? "Choose next action" : `Move to ${label(nextOrderStatuses[order.status][0])}` : order.status === "order_placed" ? "Assign tailor first" : "No next step"} options={(nextOrderStatuses[order.status] || []).map((value) => ({ value, label: orderActionLabels[value] || label(value) }))} onChange={(nextStatus) => void updateOrderStatus(order._id, nextStatus)} /></div></td>
              <td className="px-4 py-4 text-xs capitalize text-stone-600">{label(order.paymentStatus)}</td><td className="px-4 py-4 text-sm">{"\u20B9"}{(order.totalAmount || 0).toLocaleString("en-IN")}</td><td className="px-4 py-4"><button aria-label="View order details" onClick={() => setRecordTarget({ kind: "order", id: order._id })} className="rounded-lg p-2 text-stone-500 hover:bg-[#fdfcf8]"><Eye className="h-4 w-4"/></button></td>
            </tr>) : <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-stone-500">No orders match these filters.</td></tr> : consultations.length ? consultations.map((item) => <tr key={item._id}>
              <td className="px-4 py-4 text-sm font-medium">{item.name}</td><td className="px-4 py-4 text-sm text-stone-600">{item.email}<span className="block">{item.phone}</span></td><td className="px-4 py-4 text-sm text-stone-600">{item.garmentInterest}</td><td className="px-4 py-4 text-sm text-stone-600">{formatDate(item.preferredDate)}<span className="block">{item.preferredTime}</span></td>
              <td className="px-4 py-4"><AdminActionDropdown label={`Update status for consultation with ${item.name}`} disabled={savingId === item._id} value={item.status} options={consultationStatuses.map((value) => ({ value, label: label(value) }))} onChange={(nextStatus) => void updateConsultationStatus(item._id, nextStatus)} /></td>
              <td className="px-4 py-4"><button aria-label="View consultation details" onClick={() => setRecordTarget({ kind: "consultation", id: item._id })} className="rounded-lg p-2 text-stone-500 hover:bg-[#fdfcf8]"><Eye className="h-4 w-4"/></button></td>
            </tr>) : <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-stone-500">No consultations match these filters.</td></tr>}
          </tbody></table></div>
        {!loading && pages > 1 && <div className="flex items-center justify-between border-t border-[#eee5d7] px-5 py-3"><p className="text-xs text-stone-500">{total} records Â· Page {page} of {pages}</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => { setPage((value) => value - 1); setLoading(true); setError(""); setNotice(""); }} className="inline-flex items-center gap-1 rounded-lg border border-[#e8dcc8] px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Previous</button><button disabled={page >= pages} onClick={() => { setPage((value) => value + 1); setLoading(true); setError(""); setNotice(""); }} className="inline-flex items-center gap-1 rounded-lg border border-[#e8dcc8] px-3 py-2 text-sm disabled:opacity-40">Next<ChevronRight className="h-4 w-4"/></button></div></div>}
      </section>}

      {section === "tailors" && <section className="rounded-2xl border border-[#e8dcc8] bg-white shadow-sm"><div className="border-b border-[#eee5d7] px-5 py-4"><h2 className="font-semibold">Tailors at {branch?.name || "this branch"}</h2><p className="mt-1 text-sm text-stone-500">Current active order assignments help balance the workload.</p></div>{tailors.length ? <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">{tailors.map((person) => <article key={person._id} className="rounded-2xl border border-[#eee5d7] bg-[#fffdf8] p-5"><div className="flex items-start justify-between"><span className="rounded-xl bg-orange-50 p-2.5 text-orange-800"><Users className="h-5 w-5"/></span><span className="rounded-full bg-white px-3 py-1 text-xs text-stone-600">{person.activeOrders} active {person.activeOrders === 1 ? "order" : "orders"}</span></div><h3 className="mt-4 font-semibold">{person.name}</h3><a href={`mailto:${person.email}`} className="mt-1 block text-sm text-orange-800 hover:underline">{person.email}</a><p className="mt-1 text-sm text-stone-500">{person.phone || "No phone on file"}</p></article>)}</div> : <p className="px-5 py-12 text-center text-sm text-stone-500">No tailors are assigned to this branch yet.</p>}</section>}
    </main>
    <AdminRecordDetailsDialog target={recordTarget} onClose={() => setRecordTarget(null)} apiBase="/manager"/>
  </div>;
}



