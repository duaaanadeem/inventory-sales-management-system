"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ResponsiveTable from "@/components/tables/ResponsiveTable";
import { Plus, Search } from "lucide-react";

const products = [
  { id: 1, name: "Wireless Mouse", sku: "WM-001", category: "Accessories", price: 25.99, stock: 36 },
  { id: 2, name: "Mechanical Keyboard", sku: "MK-002", category: "Accessories", price: 89.99, stock: 15 },
  { id: 3, name: "USB-C Hub", sku: "UH-003", category: "Accessories", price: 45.0, stock: 8 },
];

export default function ProductsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your product catalog
            </p>
          </div>
          <button className="btn-primary w-full sm:w-auto">
            <Plus size={18} />
            Add Product
          </button>
        </div>

        <div className="card flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              placeholder="Search products..."
              className="input pl-10"
            />
          </div>
          <select className="input sm:w-48">
            <option>All Categories</option>
            <option>Accessories</option>
            <option>Electronics</option>
          </select>
        </div>

        <ResponsiveTable
          data={products}
          keyField="id"
          columns={[
            { key: "name", label: "Product Name" },
            { key: "sku", label: "SKU" },
            { key: "category", label: "Category", hideOnMobile: true },
            {
              key: "price",
              label: "Price",
              render: (r) => `$${r.price.toFixed(2)}`,
            },
            {
              key: "stock",
              label: "Stock",
              render: (r) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    r.stock < 10
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {r.stock}
                </span>
              ),
            },
          ]}
        />
      </div>
    </DashboardLayout>
  );
}