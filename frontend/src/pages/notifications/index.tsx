import { useEffect, useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import { notifications as mockNotifications, timeAgo } from "@/src/lib/mockData";
import type { AppNotification, NotificationType } from "@/src/lib/mockData";
import { notificationsApi } from "@/src/lib/api";
import {
  CheckCheck,
  AlertTriangle,
  ShoppingBag,
  Truck,
  Info,
  Inbox,
} from "lucide-react";

const typeStyles: Record<
  NotificationType,
  { icon: typeof Info; bg: string; text: string; label: string }
> = {
  low_stock: {
    icon: AlertTriangle,
    bg: "bg-amber-100",
    text: "text-amber-600",
    label: "Low Stock",
  },
  new_sale: {
    icon: ShoppingBag,
    bg: "bg-emerald-100",
    text: "text-emerald-600",
    label: "New Sale",
  },
  purchase_received: {
    icon: Truck,
    bg: "bg-blue-100",
    text: "text-blue-600",
    label: "Purchase",
  },
  other: {
    icon: Info,
    bg: "bg-indigo-100",
    text: "text-indigo-600",
    label: "Info",
  },
};

type FilterKey = "all" | "unread";

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await notificationsApi.list();
        if (!cancelled) setItems(data.notifications);
      } catch {
        setItems(mockNotifications);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount =
    items === null ? 0 : items.filter((n) => !n.isRead).length;
  const filtered =
    items === null
      ? []
      : filter === "unread"
        ? items.filter((n) => !n.isRead)
        : items;

  const markRead = (id: number) => {
    setItems((prev) =>
      prev === null
        ? prev
        : prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    notificationsApi.markRead(id).catch(() => {});
  };

  const markAllRead = () => {
    setItems((prev) =>
      prev === null ? prev : prev.map((n) => ({ ...n, isRead: true }))
    );
    notificationsApi.markAllRead().catch(() => {});
  };

  const tabs = [
    { key: "all" as const, label: "All" },
    { key: "unread" as const, label: "Unread" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Notifications
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Stay on top of low stock, sales and purchase activity
            </p>
          </div>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck size={18} />
            Mark All Read
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/70 rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                filter === tab.key
                  ? "bg-primary-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
              {tab.key === "unread" && unreadCount > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === "unread"
                      ? "bg-white/20"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {items === null ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-3">
              Loading notifications...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
              <Inbox size={28} />
            </div>
            <p className="font-medium text-slate-700">No notifications</p>
            <p className="text-sm text-slate-500">You're all caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const style = typeStyles[n.type];
              const Icon = style.icon;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => markRead(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") markRead(n.id);
                  }}
                  className={`card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    n.isRead
                      ? "opacity-70"
                      : "border-l-4 border-l-primary-500 shadow-sm"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg ${style.bg} ${style.text} shrink-0 self-start sm:self-auto`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm sm:text-base ${
                        n.isRead ? "text-slate-600" : "text-slate-900 font-medium"
                      }`}
                    >
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {style.label} · {mounted ? timeAgo(n.createdAt) : ""}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 sm:self-center self-start" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}