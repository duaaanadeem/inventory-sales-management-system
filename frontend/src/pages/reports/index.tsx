import { useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import SalesChart from "@/src/components/dashboard/SalesChart";
import {
  Download,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  Package,
  Truck,
} from "lucide-react";

const reportTypes = [
  { title: "Daily Sales", desc: "Sales summary for a single day", icon: TrendingUp, color: "blue" },
  { title: "Weekly Sales", desc: "Sales summary for the past week", icon: TrendingUp, color: "green" },
  { title: "Monthly Sales", desc: "Sales summary for a month", icon: TrendingUp, color: "purple" },
  { title: "Product Sales", desc: "Best-selling products report", icon: Package, color: "indigo" },
  { title: "Inventory Report", desc: "Current stock levels", icon: Package, color: "teal" },
  { title: "Profit Report", desc: "Revenue vs cost analysis", icon: TrendingUp, color: "yellow" },
  { title: "Customer Report", desc: "Customer purchase history", icon: Users, color: "red" },
  { title: "Supplier Purchases", desc: "Purchases from suppliers", icon: Truck, color: "blue" },
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  purple: "bg-violet-50 text-violet-600",
  indigo: "bg-indigo-50 text-indigo-600",
  teal: "bg-teal-50 text-teal-600",
  yellow: "bg-amber-50 text-amber-600",
  red: "bg-rose-50 text-rose-600",
};

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and export business reports
          </p>
        </div>

        {/* Date Range */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input"
              />
            </div>
            <button className="btn-primary w-full sm:w-auto">
              <Calendar size={18} />
              Generate
            </button>
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {reportTypes.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="card hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[r.color]}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                  {r.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">{r.desc}</p>
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1 text-xs py-2">
                    <Download size={14} />
                    Excel
                  </button>
                  <button className="btn-secondary flex-1 text-xs py-2">
                    <Download size={14} />
                    PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview Chart */}
        <SalesChart />
      </div>
    </DashboardLayout>
  );
}