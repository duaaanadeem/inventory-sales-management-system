"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import SalesChart from "@/components/dashboard/SalesChart";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";

const stats = [
  { title: "Total Sales", value: "$45,231", icon: DollarSign, color: "blue" },
  { title: "Today's Sales", value: "$1,245", icon: TrendingUp, color: "green" },
  { title: "Total Products", value: "342", icon: Package, color: "purple" },
  { title: "Low Stock", value: "12", icon: AlertTriangle, color: "red" },
  { title: "Customers", value: "1,024", icon: Users, color: "indigo" },
  { title: "Pending Orders", value: "8", icon: Clock, color: "yellow" },
  { title: "Monthly Revenue", value: "$12,450", icon: ShoppingBag, color: "teal" },
];

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">
              Welcome back! Here's your business overview.
            </p>
          </div>
          <span className="text-xs sm:text-sm text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-lg w-fit">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <SalesChart />
        </div>
      </div>
    </DashboardLayout>
  );
}