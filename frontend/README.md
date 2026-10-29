## 💎 Architecture Overview

**Darzaani** is built as a high-performance monorepo separated into `/frontend` and `/backend`:

- **Domain-Driven Measurement Models:** Captures client body metrics as immutable subdocument snapshots at order creation time to guarantee historical accuracy.
- **Multi-Stage Fulfillment State Machine:** Tracks bespoke garments across custom production lifecycles (`Fabric Received` → `Master Cut` → `Stitching` → `Quality Audit` → `Dispatched`).
- **Role-Based Access Control (RBAC):** Multi-tenant dashboard access designed for Clients, Master Tailors, and Store Admins.
- **Luxury-Tech UI/UX:** Built using Next.js 14 App Router, Tailwind CSS, Framer Motion animations, and Lucide React icons.
