import { useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import Modal from "@/src/components/ui/Modal";
import {
  Search,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Package,
} from "lucide-react";

const inventory = [
  { id: 1, name: "Wireless Mouse", sku: "WM-001", opening: 50, sold: 12, damaged: 2, current: 36, min: 10 },
  { id: 2, name: "Mechanical Keyboard", sku: "MK-002", opening: 30, sold: 15, damaged: 0, current: 15, min: 5 },
  { id: 3, name: "USB-C Hub", sku: "UH-003", opening: 20, sold: 12, damaged: 0, current: 8, min: 10 },
  { id: 4, name: 'Monitor 24"', sku: "MN-004", opening: 15, sold: 3, damaged: 1, current: 11, min: 5 },
];

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);

  const filtered = inventory.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = inventory.filter((i) => i.current <= i.min).length;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Inventory
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track stock in, stock out, and current levels
            </p>
          </div>
          <button
            onClick={() => setAdjustOpen(true)}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus size={18} />
            Stock Adjustment
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Package size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Items</p>
                <p className="text-lg font-bold text-slate-900">{inventory.length}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownToLine size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total In</p>
                <p className="text-lg font-bold text-slate-900">
                  {inventory.reduce((s, i) => s + i.opening, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                <ArrowUpFromLine size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Sold / Damaged</p>
                <p className="text-lg font-bold text-slate-900">
                  {inventory.reduce((s, i) => s + i.sold + i.damaged, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Low Stock</p>
                <p className="text-lg font-bold text-slate-900">{lowStock}</p>
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
              placeholder="Search inventory by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select className="input sm:w-44">
            <option>All Categories</option>
            <option>Accessories</option>
            <option>Electronics</option>
          </select>
        </div>

        {/* Table */}
        <ResponsiveTable
          data={filtered}
          keyField="id"
          columns={[
            { key: "name", label: "Product" },
            { key: "sku", label: "SKU" },
            { key: "opening", label: "Opening", hideOnMobile: true },
            { key: "sold", label: "Sold" },
            { key: "damaged", label: "Damaged", hideOnMobile: true },
            {
              key: "current",
              label: "Current Stock",
              render: (r) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    r.current <= r.min
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {r.current}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Stock Adjustment"
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Product
            </label>
            <select className="input">
              {inventory.map((i) => (
                <option key={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Adjustment Type
            </label>
            <select className="input">
              <option>Stock In</option>
              <option>Stock Out</option>
              <option>Damaged</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Quantity
            </label>
            <input type="number" className="input" min="1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reason
            </label>
            <textarea className="input" rows={3} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => setAdjustOpen(false)}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Save Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}