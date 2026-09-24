"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import SalesChart from "../../components/dashboard/SalesChart";
import axios from "axios";

import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";

interface Sale {
  id: number;
  customer_id: number;
  customer_name: string;
  staff_id: number;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  payment_method: string;
  status: string;
  created_at: string;
  invoice_number: string;
}
interface SaleItem {
  product_id: number;
  name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

interface SaleDetails {
  id: number;
  total: string;
  payment_method: string;
  status: string;
  created_at: string;
  items: SaleItem[];
}
export default function DashboardPage() {
  const [inventoryData, setInventoryData] = useState({
    total_products: 0,
    low_stock_count: 0,
  });

  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<
  { name: string; quantity: number }[]
>([]);

const [customersCount, setCustomersCount] = useState(0);
const [pendingOrders, setPendingOrders] = useState(0);

const [categoryRevenue, setCategoryRevenue] = useState<
  { category: string; revenue: number }[]
>([]);

const [lowStockProducts, setLowStockProducts] = useState<
  {
    id: number;
    name: string;
    current_stock: number;
    min_stock_level: number;
  }[]
>([]);
  useEffect(() => {
    axios
      .get("http://localhost:5000/inventory/summary")
      .then((response) => {
        setInventoryData(response.data.data);
      })
      .catch((error) => {
        console.error("Error fetching inventory summary:", error);
      });

       axios
  .get("http://localhost:5000/api/sales")
  .then(async (response) => {
    const allSales = response.data.data;

const pending = allSales.filter(
  (sale: Sale) => sale.status === "pending"
);

setPendingOrders(pending.length);
    const completedSales = response.data.data.filter(
      (sale: Sale) => sale.status === "completed"
    );

    setSalesData(completedSales);

    const saleDetails = await Promise.all(
  completedSales.map((sale: Sale) =>
    axios.get(`http://localhost:5000/api/sales/${sale.id}`)
  )
);

const productMap: Record<
  string,
  { name: string; quantity: number }
> = {};

const categoryMap: Record<string, number> = {};

for (const response of saleDetails) {
  const sale: SaleDetails = response.data.data;

  for (const item of sale.items) {
    if (productMap[item.product_id]) {
      productMap[item.product_id].quantity += Number(item.quantity);
    } else {
      productMap[item.product_id] = {
        name: item.name,
        quantity: Number(item.quantity),
      };
    }

    const productResponse = await axios.get(
      `http://localhost:5000/api/products/${item.product_id}`
    );

    const product = productResponse.data.data;

    const categoryName = product.category_name;
    const revenue = Number(item.line_total);

    if (categoryMap[categoryName]) {
      categoryMap[categoryName] += revenue;
    } else {
      categoryMap[categoryName] = revenue;
    }
  }
}

const sortedProducts = Object.values(productMap)
  .sort((a, b) => b.quantity - a.quantity)
  .slice(0, 5);

setTopProducts(sortedProducts);

const sortedCategories = Object.entries(categoryMap)
  .map(([category, revenue]) => ({
    category,
    revenue,
  }))
  .sort((a, b) => b.revenue - a.revenue);

setCategoryRevenue(sortedCategories);
})
  .catch((error) => {
    console.error("Error fetching sales:", error);
  });


 axios
  .get("http://localhost:5000/inventory/low-stock")
  .then(async (response) => {
    const lowStock = response.data.data.low_stock_products;

    const matchedProducts = await Promise.all(
      lowStock.map(
        async (item: {
          product_id: number;
          current_stock: number;
          min_stock_level: number;
        }) => {
          const productResponse = await axios.get(
            `http://localhost:5000/api/products/${item.product_id}`
          );

          const product = productResponse.data.data;

          return {
            id: product.id,
            name: product.name,
            current_stock: item.current_stock,
            min_stock_level: item.min_stock_level,
          };
        }
      )
    );

    setLowStockProducts(matchedProducts);
  })
  .catch((error) => {
    console.error("Error fetching low stock products:", error);
  });

axios
  .get("http://localhost:5000/customers/count")
  .then((response) => {
    setCustomersCount(response.data.data.total);
  })
  .catch((error) => {
    console.error("Error fetching customers count:", error);
  });    
  }, []);

  const totalSales = salesData.reduce(
    (total, sale) => total + Number(sale.total),
    0
  );

  const today = new Date();

  const todaysSales = salesData
    .filter((sale) => {
      const saleDate = new Date(sale.created_at);

      return (
        saleDate.getFullYear() === today.getFullYear() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getDate() === today.getDate()
      );
    })
    .reduce((total, sale) => total + Number(sale.total), 0);

  const monthlyRevenue = salesData
    .filter((sale) => {
      const saleDate = new Date(sale.created_at);

      return (
        saleDate.getFullYear() === today.getFullYear() &&
        saleDate.getMonth() === today.getMonth()
      );
    })
    .reduce((total, sale) => total + Number(sale.total), 0);

    const dailySales = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));

  const dayName = date.toLocaleDateString("en-US", {
    weekday: "short",
  });

  const salesForDay = salesData
    .filter((sale) => {
      const saleDate = new Date(sale.created_at);

      return (
        saleDate.getFullYear() === date.getFullYear() &&
        saleDate.getMonth() === date.getMonth() &&
        saleDate.getDate() === date.getDate()
      );
    })
    .reduce((total, sale) => total + Number(sale.total), 0);

  return {
    name: dayName,
    sales: salesForDay,
  };
});
  const stats = [
    {
      title: "Total Sales",
      value: `$${totalSales.toFixed(2)}`,
      icon: DollarSign,
      color: "blue",
    },
    {
      title: "Today's Sales",
      value: `$${todaysSales.toFixed(2)}`,
      icon: TrendingUp,
      color: "green",
    },
    {
      title: "Total Products",
      value: inventoryData.total_products.toString(),
      icon: Package,
      color: "purple",
    },
    {
      title: "Low Stock",
      value: inventoryData.low_stock_count.toString(),
      icon: AlertTriangle,
      color: "red",
    },
    {
      title: "Customers",
      value:customersCount.toString(),
      icon: Users,
      color: "indigo",
    },
    {
      title: "Pending Orders",
      value: pendingOrders.toString(),
      icon: Clock,
      color: "yellow",
    },
    {
      title: "Monthly Revenue",
      value: `$${monthlyRevenue.toFixed(2)}`,
      icon: ShoppingBag,
      color: "teal",
    },
  ];

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
          <SalesChart salesData={dailySales}/>
        </div>

        <div className="card">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-base sm:text-lg font-semibold text-slate-900">
        Top-selling Products
      </h2>

      <p className="text-xs text-slate-500 mt-1">
        Most sold products
      </p>
    </div>

    <TrendingUp className="w-5 h-5 text-green-500" />
  </div>

  <div className="space-y-3">
    {topProducts.length > 0 ? (
      topProducts.map((product, index) => (
        <div
          key={`${product.name}-${index}`}
          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-600">
              {index + 1}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900">
                {product.name}
              </p>

              <p className="text-xs text-slate-500">
                {product.quantity} units sold
              </p>
            </div>
          </div>

          <span className="text-sm font-semibold text-slate-700">
            {product.quantity}
          </span>
        </div>
      ))
    ) : (
      <p className="text-sm text-slate-500 text-center py-6">
        No sales data available
      </p>
    )}
  </div>
</div>


  <div className="card">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-base sm:text-lg font-semibold text-slate-900">
        Low Stock Products
      </h2>

      <p className="text-xs text-slate-500 mt-1">
        Products that need restocking
      </p>
    </div>

    <AlertTriangle className="w-5 h-5 text-red-500" />
  </div>

  <div className="space-y-3">
    {lowStockProducts.length > 0 ? (
      lowStockProducts.map((product) => (
        <div
          key={product.id}
          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
        >
          <div>
            <p className="text-sm font-medium text-slate-900">
              {product.name}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Minimum stock: {product.min_stock_level}
            </p>
          </div>

          <span className="text-sm font-semibold text-red-600">
            {product.current_stock} left
          </span>
        </div>
      ))
    ) : (
      <p className="text-sm text-slate-500 text-center py-6">
        No low stock products
      </p>
    )}
  </div>
</div>

<div className="card">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-base sm:text-lg font-semibold text-slate-900">
        Revenue by Category
      </h2>

      <p className="text-xs text-slate-500 mt-1">
        Revenue generated by each category
      </p>
    </div>

    <ShoppingBag className="w-5 h-5 text-teal-500" />
  </div>

  <div className="space-y-3">
    {categoryRevenue.length > 0 ? (
      categoryRevenue.map((item) => (
        <div
          key={item.category}
          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
        >
          <p className="text-sm font-medium text-slate-900">
            {item.category}
          </p>

          <span className="text-sm font-semibold text-slate-700">
            ${item.revenue.toFixed(2)}
          </span>
        </div>
      ))
    ) : (
      <p className="text-sm text-slate-500 text-center py-6">
        No category revenue available
      </p>
    )}
  </div>
</div>
      </div>
    </DashboardLayout>
  );
}