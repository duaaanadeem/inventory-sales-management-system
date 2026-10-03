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