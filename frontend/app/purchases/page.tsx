"use client";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ResponsiveTable from "@/components/tables/ResponsiveTable";
import Modal from "@/components/ui/Modal";
import { Search, Plus } from "lucide-react";

const purchases = [
  { id: 1, po: "PO-1001", supplier: "Acme Supplies", date: "2026-09-15", items: 50, cost: 1250.0, status: "Paid" },
  { id: 2, po: "PO-1002", supplier: "TechSource", date: "2026-09-17", items: 20, cost: 3400.0, status: "Pending" },
  { id: 3, po: "PO-1003", supplier: "Global Gadgets", date: "2026-09-18", items: 35, cost: 2100.5, status: "Paid" },
  { id: 4, po: "PO-1004", supplier: "Acme Supplies", date: "2026-09-19", items: 15, cost: 890.0, status: "Pending" },
];

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = purchases.filter((p) => {
    const matchesSearch =
      p.po.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "All" || p.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Purchase Orders
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create and track purchase orders from suppliers
            </p>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus size={18} />
            New Purchase Order
          </button>
        </div>

        <div className="card flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search by PO number or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            className="input sm:w-40"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All</option>
            <option>Paid</option>
            <option>Pending</option>
          </select>
        </div>

        <ResponsiveTable
          data={filtered}
          keyField="id"
          columns={[
            { key: "po", label: "PO #" },
            { key: "supplier", label: "Supplier" },
            { key: "date", label: "Date" },
            { key: "items", label: "Items", hideOnMobile: true },
            {
              key: "cost",
              label: "Total",
              render: (r) => (
                <span className="font-semibold">${r.cost.toFixed(2)}</span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    r.status === "Paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {r.status}
                </span>
              ),
            },
          ]}
        />
      </div>

      <Modal
        isOpen={newOpen}
        onClose={() => setNewOpen(false)}
        title="New Purchase Order"
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Supplier
            </label>
            <select className="input">
              <option>Acme Supplies</option>
              <option>TechSource</option>
              <option>Global Gadgets</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Product
            </label>
            <select className="input">
              <option>Wireless Mouse</option>
              <option>Mechanical Keyboard</option>
              <option>USB-C Hub</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Quantity
              </label>
              <input type="number" className="input" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Unit Cost
              </label>
              <input type="number" step="0.01" className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Purchase Date
            </label>
            <input type="date" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Payment Status
            </label>
            <select className="input">
              <option>Pending</option>
              <option>Paid</option>
            </select>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Create Purchase Order
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}