export type NotificationType =
  | "low_stock"
  | "new_sale"
  | "purchase_received"
  | "other";

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
  relatedId?: number;
  isRead: boolean;
  createdAt: string;
}

export type EntityType =
  | "product"
  | "sale"
  | "stock"
  | "invoice"
  | "supplier"
  | "customer"
  | "purchase"
  | "user";

export interface ActivityEntry {
  id: number;
  user: string;
  role: "Admin" | "Staff";
  action: string;
  entityType: EntityType;
  entityId?: number;
  createdAt: string;
}

const now = Date.now();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const notifications: AppNotification[] = [
  {
    id: 1,
    type: "low_stock",
    message: "Wireless Mouse is low in stock (4 left, min 10)",
    relatedId: 1,
    isRead: false,
    createdAt: new Date(now - 9 * MINUTE).toISOString(),
  },
  {
    id: 2,
    type: "low_stock",
    message: "5 products are below minimum stock",
    isRead: false,
    createdAt: new Date(now - 34 * MINUTE).toISOString(),
  },
  {
    id: 3,
    type: "new_sale",
    message: "New sale completed - Sale #1024 worth $145.00",
    relatedId: 1024,
    isRead: false,
    createdAt: new Date(now - 2 * HOUR).toISOString(),
  },
  {
    id: 4,
    type: "purchase_received",
    message: "Purchase order received - PO-2312 from TechSupply Co.",
    relatedId: 2312,
    isRead: false,
    createdAt: new Date(now - 5 * HOUR).toISOString(),
  },
  {
    id: 5,
    type: "other",
    message: "Invoice #INV-447 generated for Sale #1021",
    isRead: true,
    createdAt: new Date(now - DAY).toISOString(),
  },
  {
    id: 6,
    type: "new_sale",
    message: "New sale completed - Sale #1023 worth $89.50",
    relatedId: 1023,
    isRead: true,
    createdAt: new Date(now - DAY - 3 * HOUR).toISOString(),
  },
  {
    id: 7,
    type: "low_stock",
    message: "USB-C Hub is low in stock (8 left, min 10)",
    relatedId: 3,
    isRead: true,
    createdAt: new Date(now - 2 * DAY).toISOString(),
  },
  {
    id: 8,
    type: "purchase_received",
    message: "Purchase order received - PO-2311 from GlobalParts Ltd.",
    relatedId: 2311,
    isRead: true,
    createdAt: new Date(now - 3 * DAY).toISOString(),
  },
];

export const activities: ActivityEntry[] = [
  {
    id: 1,
    user: "Ayesha Khan",
    role: "Admin",
    action: "added Product",
    entityType: "product",
    entityId: 42,
    createdAt: new Date(now - 8 * MINUTE).toISOString(),
  },
  {
    id: 2,
    user: "Bilal Ahmed",
    role: "Staff",
    action: "created Sale",
    entityType: "sale",
    entityId: 1024,
    createdAt: new Date(now - 25 * MINUTE).toISOString(),
  },
  {
    id: 3,
    user: "Ayesha Khan",
    role: "Admin",
    action: "updated stock",
    entityType: "stock",
    createdAt: new Date(now - 48 * MINUTE).toISOString(),
  },
  {
    id: 4,
    user: "Bilal Ahmed",
    role: "Staff",
    action: "generated Invoice",
    entityType: "invoice",
    createdAt: new Date(now - 2 * HOUR).toISOString(),
  },
  {
    id: 5,
    user: "Ayesha Khan",
    role: "Admin",
    action: "added Supplier",
    entityType: "supplier",
    entityId: 7,
    createdAt: new Date(now - 4 * HOUR).toISOString(),
  },
  {
    id: 6,
    user: "Sara Malik",
    role: "Staff",
    action: "updated customer",
    entityType: "customer",
    entityId: 12,
    createdAt: new Date(now - 6 * HOUR).toISOString(),
  },
  {
    id: 7,
    user: "Ayesha Khan",
    role: "Admin",
    action: "received Purchase order",
    entityType: "purchase",
    entityId: 2312,
    createdAt: new Date(now - DAY).toISOString(),
  },
  {
    id: 8,
    user: "Bilal Ahmed",
    role: "Staff",
    action: "adjusted inventory",
    entityType: "stock",
    createdAt: new Date(now - DAY - 2 * HOUR).toISOString(),
  },
  {
    id: 9,
    user: "Ayesha Khan",
    role: "Admin",
    action: "updated Product",
    entityType: "product",
    entityId: 40,
    createdAt: new Date(now - 2 * DAY).toISOString(),
  },
  {
    id: 10,
    user: "Sara Malik",
    role: "Staff",
    action: "created Sale",
    entityType: "sale",
    entityId: 1022,
    createdAt: new Date(now - 3 * DAY).toISOString(),
  },
];

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}