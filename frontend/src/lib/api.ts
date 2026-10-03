import type { AppNotification, ActivityEntry, EntityType } from "./mockData";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

import apiClient from "@/src/lib/apiClient";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    // If path doesn't start with /api, we might need to prepend it, but apiClient uses baseURL=/api
    // Let's strip /api prefix from path if it exists to avoid double /api/api
    const url = path.replace(/^\/api/, "");
    
    const response = await apiClient({
      url,
      method: options.method || "GET",
      data: options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : undefined,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      } as any,
    });
    return response.data.data as T;
  } catch (error: any) {
    if (error.response?.data) {
      throw new Error(error.response.data.error || error.response.data.message || "Request failed");
    }
    throw new Error(error.message || "Request failed");
  }
}

// Adapters: backend snake_case -> frontend camelCase shapes
function toNotification(raw: any): AppNotification {
  return {
    id: raw.id,
    type: raw.type,
    message: raw.message,
    relatedId: raw.related_id ?? undefined,
    isRead: raw.is_read,
    createdAt: raw.created_at,
  };
}

function toActivity(raw: any): ActivityEntry {
  return {
    id: raw.id,
    user: raw.full_name || "Unknown User",
    role: raw.role === "admin" ? "Admin" : "Staff",
    action: raw.action,
    entityType: (raw.entity_type || "other") as EntityType,
    entityId: raw.entity_id ?? undefined,
    createdAt: raw.created_at,
  };
}

export interface NotificationListResult {
  notifications: AppNotification[];
  unreadCount: number;
}

export interface ActivitySummary {
  total_actions: number;
  today_actions: number;
  by_entity: Array<{ entity_type: string; count: number }>;
}

export const notificationsApi = {
  async list(params: { unread?: boolean } = {}): Promise<NotificationListResult> {
    const query = `limit=50${params.unread ? "&unread=true" : ""}`;
    const raw = await request<any>(`/notifications?${query}`);
    return {
      notifications: (raw.notifications || []).map(toNotification),
      unreadCount: raw.unread_count,
    };
  },

  async unreadCount(): Promise<{ unread_count: number }> {
    return request("/notifications/unread-count");
  },

  markRead(id: number) {
    return request(`/notifications/${id}/read`, { method: "PATCH" });
  },

  markAllRead() {
    return request("/notifications/read-all", { method: "PATCH" });
  },
};

export const activitiesApi = {
  async list(): Promise<ActivityEntry[]> {
    const raw = await request<any>("/activities");
    return (raw.activities || []).map(toActivity);
  },

  async summary(): Promise<ActivitySummary> {
    return request("/activities/summary");
  },
};
// Adapter: backend returns NUMERIC columns as strings (pg driver default) -
// keep raw, format with toCurrency() at render time instead of parsing here.
export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  total_spending: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  orders_count?: number;
  last_purchase_at?: string | null;
}

export interface CustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CustomerListResult {
  customers: Customer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CustomerPurchase {
  id: number;
  created_at: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  payment_method: string;
  status: "completed" | "pending" | "cancelled";
  invoice_number: string | null;
  items: Array<{
    product_id: number;
    name: string;
    sku: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }>;
}

export interface CustomerPurchaseResult {
  purchases: CustomerPurchase[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const customersApi = {
  async list(
    params: { search?: string; sort?: string; order?: string; page?: number; limit?: number } = {}
  ): Promise<CustomerListResult> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.sort) query.set("sort", params.sort);
    if (params.order) query.set("order", params.order);
    query.set("page", String(params.page || 1));
    query.set("limit", String(params.limit || 10));
    return request<CustomerListResult>(`/customers?${query.toString()}`);
  },

  async count(): Promise<{ total: number }> {
    return request("/customers/count");
  },

  async get(id: number): Promise<{ customer: Customer }> {
    return request(`/customers/${id}`);
  },

  async create(payload: CustomerPayload): Promise<{ customer: Customer }> {
    return request("/customers", { method: "POST", body: JSON.stringify(payload) });
  },

  async update(id: number, payload: CustomerPayload): Promise<{ customer: Customer }> {
    return request(`/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },

  async remove(id: number): Promise<void> {
    await request(`/customers/${id}`, { method: "DELETE" });
  },

  async purchases(
    id: number,
    params: { from?: string; to?: string; page?: number; limit?: number } = {}
  ): Promise<CustomerPurchaseResult> {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    query.set("page", String(params.page || 1));
    query.set("limit", String(params.limit || 5));
    return request<CustomerPurchaseResult>(`/customers/${id}/purchases?${query.toString()}`);
  },
};

export const reportsApi = {
  sales: (type: string, from: string, to: string) => 
    request(`/reports/sales?type=${type}&from=${from}&to=${to}`),
  products: (from: string, to: string, limit: number = 10) => 
    request(`/reports/products?from=${from}&to=${to}&limit=${limit}`),
  inventory: (productId?: string) => 
    request(`/reports/inventory${productId ? `?productId=${productId}` : ''}`),
  profit: (from: string, to: string) => 
    request(`/reports/profit?from=${from}&to=${to}`),
  customers: (from: string, to: string, limit: number = 10) => 
    request(`/reports/customers?from=${from}&to=${to}&limit=${limit}`),
  suppliers: (from: string, to: string) => 
    request(`/reports/suppliers?from=${from}&to=${to}`),
};

