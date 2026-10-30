"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import API from "@/lib/api";

export interface AdminRecordTarget {
  kind: "consultation" | "order";
  id: string;
}

interface ConsultationDetail {
  _id: string;
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  consultationType: "atelier" | "video";
  garmentInterest: string;
  notes?: string;
  status: string;
  branch?: { name: string; code: string } | null;
  createdAt: string;
}

interface OrderItemDetail {
  _id?: string;
  garment?: string | { name: string } | null;
  sizingTypeUsed: string;
  selectedStandardSize?: string;
  selectedColor?: string;
  fabricDetails?: string;
  customizationNotes?: string;
  measurementSnapshot?: Record<string, string | number | undefined>;
  referenceImages?: string[];
  itemPrice: number;
  quantity: number;
}

interface WorkflowEvent {
  type: "payment_confirmed" | "tailor_assigned" | "status_changed";
  fromStatus?: string;
  toStatus?: string;
  actor?: string | { name: string; role?: string } | null;
  note?: string;
  createdAt: string;
}

interface OrderDetail {
  _id: string;
  customer: string | { name: string; email: string; phone?: string };
  assignedTailor?: string | { name: string } | null;
  items: OrderItemDetail[];
  status: string;
  totalAmount: number;
  advancePaid: number;
  paymentStatus: string;
  estimatedCompletionDate?: string;
  createdAt: string;
  workflowHistory?: WorkflowEvent[];
}

type RecordDetails =
  | { kind: "consultation"; record: ConsultationDetail }
  | { kind: "order"; record: OrderDetail };

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#fdfcf8] p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <div className="mt-1.5 break-words text-sm text-stone-800">{children || "—"}</div>
    </div>
  );
}

function formatDateTime(date?: string) {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(date?: string) {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function ConsultationContent({ consultation }: { consultation: ConsultationDetail }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Customer">{consultation.name}</DetailField>
        <DetailField label="Status"><span className="capitalize">{consultation.status.replace(/[-_]/g, " ")}</span></DetailField>
        <DetailField label="Email"><a className="text-orange-800 hover:underline" href={`mailto:${consultation.email}`}>{consultation.email}</a></DetailField>
        <DetailField label="Phone"><a className="text-orange-800 hover:underline" href={`tel:${consultation.phone}`}>{consultation.phone}</a></DetailField>
        <DetailField label="Preferred date and time">{formatDate(consultation.preferredDate)} · {consultation.preferredTime}</DetailField>
        <DetailField label="Appointment type">{consultation.consultationType === "video" ? "Video call" : "Atelier visit"}</DetailField>
        <DetailField label="Interested in">{consultation.garmentInterest}</DetailField>
        <DetailField label="Branch">{consultation.branch ? `${consultation.branch.name} (${consultation.branch.code})` : "Not assigned"}</DetailField>
      </div>
      <DetailField label="Customer notes">{consultation.notes?.trim() || "No notes provided."}</DetailField>
      <p className="text-xs text-stone-500">Requested {formatDateTime(consultation.createdAt)}</p>
    </div>
  );
}

function OrderContent({ order }: { order: OrderDetail }) {
  const customer = typeof order.customer === "object" ? order.customer : null;
  const tailor = typeof order.assignedTailor === "object" ? order.assignedTailor : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Customer">{customer?.name || "Customer"}</DetailField>
        <DetailField label="Email">{customer?.email || "—"}</DetailField>
        <DetailField label="Phone">{customer?.phone || "—"}</DetailField>
        <DetailField label="Production stage"><span className="capitalize">{order.status.replace(/[-_]/g, " ")}</span></DetailField>
        <DetailField label="Payment"><span className="capitalize">{order.paymentStatus.replace(/[-_]/g, " ")}</span></DetailField>
        <DetailField label="Assigned tailor">{tailor?.name || "Not assigned"}</DetailField>
        <DetailField label="Order total">₹{order.totalAmount.toLocaleString("en-IN")}</DetailField>
        <DetailField label="Advance paid">₹{order.advancePaid.toLocaleString("en-IN")}</DetailField>
        <DetailField label="Estimated completion">{formatDate(order.estimatedCompletionDate)}</DetailField>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-stone-900">Items</h3>
        <div className="space-y-3">
          {order.items.map((item, index) => {
            const garmentName = typeof item.garment === "object" && item.garment ? item.garment.name : "Garment";
            const itemDetails = [
              item.sizingTypeUsed === "standard" ? item.selectedStandardSize : "Custom fit",
              item.selectedColor,
              item.fabricDetails,
            ].filter(Boolean);
            return (
              <div key={`${garmentName}-${index}`} className="rounded-xl border border-[#e8dcc8] p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-stone-900">{garmentName} <span className="text-stone-500">× {item.quantity}</span></p>
                  <p className="text-sm font-semibold text-orange-800">₹{(item.itemPrice * item.quantity).toLocaleString("en-IN")}</p>
                </div>
                {itemDetails.length > 0 && <p className="mt-1 text-xs text-stone-600">{itemDetails.join(" · ")}</p>}
                {item.customizationNotes && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600">{item.customizationNotes}</p>}
                {item.measurementSnapshot && <div className="mt-3 rounded-xl bg-[#fdfcf8] p-3"><p className="text-xs font-semibold text-stone-700">Fit measurements ({item.measurementSnapshot.unit || "unit not specified"})</p><dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">{Object.entries(item.measurementSnapshot).filter(([key, value]) => key !== "unit" && key !== "profileTitle" && key !== "notes" && value !== undefined).map(([key, value]) => <div key={key} className="flex justify-between gap-2 text-xs"><dt className="capitalize text-stone-500">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="font-medium text-stone-800">{value}</dd></div>)}</dl>{item.measurementSnapshot.notes && <p className="mt-2 text-xs text-stone-600">Fit notes: {item.measurementSnapshot.notes}</p>}</div>}
                {!!item.referenceImages?.length && <div className="mt-3 flex flex-wrap gap-2">{item.referenceImages.map((image, imageIndex) => <a key={`${image}-${imageIndex}`} href={image} target="_blank" rel="noreferrer" className="rounded-full border border-[#e8dcc8] px-3 py-1.5 text-xs font-medium text-orange-800 hover:bg-orange-50">Reference image {imageIndex + 1}</a>)}</div>}
              </div>
            );
          })}
        </div>
      </div>
      {!!order.workflowHistory?.length && <div>
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Order timeline</h3>
        <ol className="space-y-3 border-l border-[#e8dcc8] pl-4">
          {[...order.workflowHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((event, index) => {
            const actor = typeof event.actor === "object" ? event.actor?.name : undefined;
            const title = event.type === "payment_confirmed" ? "Payment confirmed" : event.type === "tailor_assigned" ? "Tailor assigned" : `Moved to ${event.toStatus ? event.toStatus.replace(/[-_]/g, " ") : "new stage"}`;
            return <li key={`${event.type}-${event.createdAt}-${index}`} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#fffdf8] bg-orange-700 ring-1 ring-orange-200"/><p className="font-medium text-stone-800">{title}</p><p className="mt-0.5 text-xs text-stone-500">{formatDateTime(event.createdAt)}{actor ? ` · ${actor}` : ""}</p>{event.note && <p className="mt-1 text-xs text-stone-600">{event.note}</p>}</li>;
          })}
        </ol>
      </div>}
      <p className="text-xs text-stone-500">Placed {formatDateTime(order.createdAt)}</p>
    </div>
  );
}

export default function AdminRecordDetailsDialog({
  target,
  onClose,
  apiBase = "/admin",
  orderEndpoint,
}: {
  target: AdminRecordTarget | null;
  onClose: () => void;
  apiBase?: string;
  orderEndpoint?: string;
}) {
  const [details, setDetails] = useState<RecordDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!target) return;
    let isCurrent = true;

    const loadDetails = async () => {
      setDetails(null);
      setError("");
      setIsLoading(true);
      try {
        const endpoint = target.kind === "consultation"
          ? `${apiBase}/consultations/${target.id}`
          : orderEndpoint ? `${orderEndpoint}/${target.id}` : `${apiBase}/orders/${target.id}`;
        const response = await API.get(endpoint);
        if (!isCurrent) return;
        if (target.kind === "consultation") {
          setDetails({ kind: target.kind, record: response.data.data.consultation });
        } else {
          const order = response.data.data.order as OrderDetail;
          setDetails({ kind: target.kind, record: order });
        }
      } catch (err) {
        if (!isCurrent) return;
        const apiError = err as { response?: { data?: { message?: string } } };
        setError(apiError.response?.data?.message || "Could not load these details. Please try again.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadDetails();
    return () => {
      isCurrent = false;
    };
  }, [target, retry, apiBase, orderEndpoint]);

  useEffect(() => {
    if (!target) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-stone-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#e8dcc8] bg-[#fffdf8] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e8dcc8] bg-[#fffdf8]/95 px-6 py-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-800">{target.kind === "order" ? "Order details" : "Consultation details"}</p>
            <h2 id="activity-detail-title" className="mt-1 font-serif text-2xl text-stone-900">
              {target.kind === "order" ? `Order #${target.id.slice(-6).toUpperCase()}` : "Consultation request"}
            </h2>
          </div>
          <button type="button" autoFocus aria-label="Close details" onClick={onClose} className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 sm:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-stone-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-orange-700" />
              Loading record details...
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p role="alert" className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => setRetry((count) => count + 1)} className="mt-4 rounded-full bg-[#853b20] px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-800">Try again</button>
            </div>
          ) : details?.kind === "consultation" ? (
            <ConsultationContent consultation={details.record} />
          ) : details?.kind === "order" ? (
            <div className="space-y-6">
              <OrderContent order={details.record} />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
