import { useEffect, useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import Pagination from "@/src/components/ui/Pagination";
import { useUrlPagination } from "@/src/hooks/useUrlPagination";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import { activities as mockActivities, timeAgo } from "@/src/lib/mockData";
import type { ActivityEntry, EntityType } from "@/src/lib/mockData";
import { activitiesApi } from "@/src/lib/api";
import {
  Search,
  Activity,
  CalendarClock,
  Boxes,
} from "lucide-react";

const entityColors: Record<EntityType, string> = {
  product: "bg-indigo-100 text-indigo-700",
  sale: "bg-emerald-100 text-emerald-700",
  stock: "bg-amber-100 text-amber-700",
  invoice: "bg-blue-100 text-blue-700",
  supplier: "bg-purple-100 text-purple-700",
  customer: "bg-teal-100 text-teal-700",
  purchase: "bg-cyan-100 text-cyan-700",
  user: "bg-slate-100 text-slate-700",
  other: "bg-slate-100 text-slate-700",
};

const entityFilters: Array<"All" | EntityType> = [
  "All",
  "product",
  "sale",
  "stock",
  "invoice",
  "supplier",
  "customer",
  "purchase",
];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const entityLabel = (type: EntityType) =>
  type.charAt(0).toUpperCase() + type.slice(1);

export default function ActivitiesPage() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState<"All" | EntityType>("All");
  const [items, setItems] = useState<ActivityEntry[] | null>(null);
  const [summary, setSummary] = useState<{
    total_actions: number;
    today_actions: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [listRes, summaryRes] = await Promise.allSettled([
        activitiesApi.list(),
        activitiesApi.summary(),
      ]);
      if (cancelled) return;
      setItems(
        listRes.status === "fulfilled" ? listRes.value : mockActivities
      );
      setSummary(
        summaryRes.status === "fulfilled"
          ? {
              total_actions: summaryRes.value.total_actions,
              today_actions: summaryRes.value.today_actions,
            }
          : null
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (items ?? []).filter((a) => {
    const matchesSearch =
      a.user.toLowerCase().includes(search.toLowerCase()) ||
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      entityLabel(a.entityType).toLowerCase().includes(search.toLowerCase());
    const matchesEntity = entity === "All" || a.entityType === entity;
    return matchesSearch && matchesEntity;
  });

  const todayString = mounted ? new Date().toDateString() : null;
  const todayCount = mounted
    ? (summary?.today_actions ??
      (items ?? []).filter(
        (a) => new Date(a.createdAt).toDateString() === todayString
      ).length)
    : 0;
  const entityCount = items
    ? new Set(items.map((a) => a.entityType)).size
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Activity Log
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Audit trail of important actions across the system
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary-50 text-primary-600">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Actions</p>
                <p className="text-lg font-bold text-slate-900">
                  {summary ? summary.total_actions : items ? items.length : "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CalendarClock size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Updated Today</p>
                <p className="text-lg font-bold text-slate-900">
                  {items ? todayCount : "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Boxes size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Entities Tracked</p>
                <p className="text-lg font-bold text-slate-900">
                  {entityCount || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search by user, action or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value as "All" | EntityType)}
            className="input sm:w-56"
          >
            {entityFilters.map((e) => (
              <option key={e} value={e}>
                {e === "All" ? "All Entities" : entityLabel(e)}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {items === null ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Loading activity log...</p>
          </div>
        ) : (
          <ResponsiveTable
            data={filtered}
            keyField="id"
          columns={[
            {
              key: "user",
              label: "User",
              render: (r) => (
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${
                      r.role === "Admin"
                        ? "bg-gradient-to-br from-primary-500 to-primary-700"
                        : "bg-gradient-to-br from-emerald-500 to-emerald-700"
                    }`}
                  >
                    {initialsOf(r.user)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {r.user}
                    </p>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        r.role === "Admin"
                          ? "bg-primary-100 text-primary-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {r.role}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <span className="text-sm text-slate-700">
                  {r.role} {r.action}
                </span>
              ),
            },
            {
              key: "entityType",
              label: "Entity",
              render: (r) => (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${entityColors[r.entityType]}`}
                  >
                    {entityLabel(r.entityType)}
                  </span>
                  {r.entityId !== undefined && (
                    <span className="text-xs text-slate-400">#{r.entityId}</span>
                  )}
                </div>
              ),
              hideOnMobile: true,
            },
            {
              key: "createdAt",
              label: "Time",
              render: (r) => (
                <span className="text-sm text-slate-500 whitespace-nowrap">
                  {mounted ? timeAgo(r.createdAt) : ""}
                </span>
              ),
              hideOnMobile: true,
            },
          ]}
        />
        )}
      </div>
    </DashboardLayout>
  );
}



