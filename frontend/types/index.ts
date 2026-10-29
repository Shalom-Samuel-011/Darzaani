export interface MeasurementProfile {
    _id?: string;
    profileTitle: string;
    unit: "inches" | "cm";
    shoulders?: number;
    chest?: number;
    bust?: number;
    underBust?: number;
    waistUpper?: number;
    waistLower?: number;
    hip?: number;
    armhole?: number;
    bicep?: number;
    sleeveLength?: number;
    sleeveOpening?: number;
    frontNeckDepth?: number;
    backNeckDepth?: number;
    blouseLength?: number;
    kurtiLength?: number;
    thigh?: number;
    knee?: number;
    calf?: number;
    ankleOpening?: number;
    crotchDepth?: number;
    pantLength?: number;
    lehengaLength?: number;
    fullLength?: number;
    crossBack?: number;
    notes?: string;
}

export interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: "customer" | "tailor" | "admin";
    measurements: MeasurementProfile[];
}

export type StandardSize = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "Free Size";

export interface Garment {
    _id: string;
    name: string;
    category: string;
    description: string;
    basePrice: number;
    images: string[];
    estimatedDays: number;
    isAvailable: boolean;
    sizingType?: "custom_only" | "standard_only" | "both";
    availableStandardSizes?: StandardSize[];
    availableColors?: string[];
    attributes?: Record<string, string>;
}

export interface CartLineItem {
    id: string;
    garment: Garment;
    sizingTypeUsed: "custom" | "standard";
    selectedStandardSize?: StandardSize;
    selectedMeasurementProfileId?: string;
    selectedMeasurementProfileTitle?: string;
    selectedColor: string;
    quantity: number;
}

export interface OrderItem {
    _id?: string;
    garment: Garment | string;
    sizingTypeUsed: "custom" | "standard";
    selectedStandardSize?: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "Free Size";
    measurementSnapshot?: MeasurementProfile;
    fabricSource: "provided_by_customer" | "provided_by_boutique";
    fabricDetails?: string;
    customizationNotes?: string;
    referenceImages?: string[];
    selectedColor?: string;
    itemPrice: number;
    quantity: number;
}

export interface Order {
    _id: string;
    customer: User | string;
    assignedTailor?: User | string;
    items: OrderItem[];
    fabricPickupRequired: boolean;
    fabricPickupDetails?: {
        address: string;
        pickupDate: string;
        timeSlot: string;
        status: "pending" | "scheduled" | "picked_up" | "received_at_boutique";
    };
    status:
        | "payment_pending"
        | "order_placed"
        | "awaiting_fabric"
        | "fabric_received"
        | "assigned_to_tailor"
        | "cutting"
        | "stitching"
        | "trial_ready"
        | "completed"
        | "dispatched"
        | "delivered"
        | "cancelled";
    totalAmount: number;
    paymentStatus: "pending" | "authorized" | "partially_paid" | "paid" | "failed" | "refunded";
    payment?: {
        provider: "razorpay";
        currency: "INR";
        amount: number;
        razorpayOrderId?: string;
        razorpayPaymentId?: string;
        verifiedAt?: string;
    };
    deliveryAddress: {
        street: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
    };
    createdAt: string;
}
