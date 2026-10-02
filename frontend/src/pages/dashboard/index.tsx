"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import StatCard from "@/src/components/dashboard/StatCard";
import SalesChart from "@/src/components/dashboard/SalesChart";
import apiClient from "@/src/lib/apiClient";
import { useToast } from "@/src/context/ToastContext";
import { useRouter } from "next/router";

import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";

interface DashboardData {
  total_sales: number | string;
  todays_sales: number | string;
  monthly_revenue: number | string;
  pending_orders: number | string;
  total_products: number | string;
  low_stock_products: number | string;
  total_customers: number | string;
  daily_sales: {
    sale_date: string;
    number_of_sales: number | string;
    revenue: number | string;
  }[];
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const { showToast } = useToast();
  const router = useRouter();

useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const DASHBOARD_URL = process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, "/dashboard")
        : "http://localhost:5000/dashboard";
        
      const response = await apiClient.get(DASHBOARD_URL);
      const result = response.data;

      if (result.success) {
        setDashboardData(result.data);
        showToast("Dashboard data loaded successfully", "success");
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast("Access denied: Admins only", "fail");
        router.push("/login");
      } else {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data.");
        showToast("Failed to load dashboard data", "fail");
      }
    } finally {
      setLoading(false);
    }
  };

  fetchDashboardData();
}, []);

  const formatCurrency = (value: number | string) => {
    return `$${Number(value).toLocaleString("en-US")}`;
  };

  const stats = dashboardData
    ? [
        {
          title: "Total Sales",
          value: formatCurrency(dashboardData.total_sales),
          icon: DollarSign,
          color: "blue",
        },
        {
          title: "Today's Sales",
          value: formatCurrency(dashboardData.todays_sales),
          icon: TrendingUp,
          color: "green",
        },
        {
          title: "Total Products",
          value: Number(dashboardData.total_products).toLocaleString("en-US"),
          icon: Package,
          color: "purple",
        },
        {
          title: "Low Stock",
          value: Number(dashboardData.low_stock_products).toLocaleString(
            "en-US"
          ),
          icon: AlertTriangle,
          color: "red",
        },
        {
          title: "Customers",
          value: Number(dashboardData.total_customers).toLocaleString(
            "en-US"
          ),
          icon: Users,
          color: "indigo",
        },
        {
          title: "Pending Orders",
          value: Number(dashboardData.pending_orders).toLocaleString(
            "en-US"
          ),
          icon: Clock,
          color: "yellow",
        },
        {
          title: "Monthly Revenue",
          value: formatCurrency(dashboardData.monthly_revenue),
          icon: ShoppingBag,
          color: "teal",
        },
      ]
    : [];

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

        {loading && (
          <p className="text-sm text-slate-500">
            Loading dashboard data...
          </p>
        )}

        {error && (
          <p className="text-sm text-red-500">
            {error}
          </p>
        )}


{!loading && !error && (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {stats.map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <SalesChart data={dashboardData?.daily_sales || []} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}