import { useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import Modal from "@/src/components/ui/Modal";
import { Search, Plus, Mail, Phone, MapPin } from "lucide-react";

const customers = [
  { id: 1, name: "John Doe", phone: "555-0101", email: "john@example.com", address: "123 Main St", purchases: 12, total: 1250.5 },
  { id: 2, name: "Jane Smith", phone: "555-0102", email: "jane@example.com", address: "456 Oak Ave", purchases: 8, total: 890.0 },
  { id: 3, name: "Bob Johnson", phone: "555-0103", email: "bob@example.com", address: "789 Pine Rd", purchases: 5, total: 450.25 },
  { id: 4, name: "Alice Williams", phone: "555-0104", email: "alice@example.com", address: "321 Elm Blvd", purchases: 15, total: 2100.0 },
];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<typeof customers[0] | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Customers
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage customers and view purchase history
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <ResponsiveTable
          data={filtered}
          keyField="id"
          columns={[
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email", hideOnMobile: true },
            { key: "address", label: "Address", hideOnMobile: true },
            {
              key: "purchases",
              label: "Orders",
              render: (r) => (
                <button
                  onClick={() => setSelected(r)}
                  className="text-primary-600 hover:underline font-medium"
                >
                  {r.purchases}
                </button>
              ),
            },
            {
              key: "total",
              label: "Total Spent",
              render: (r) => (
                <span className="font-semibold">${r.total.toFixed(2)}</span>
              ),
            },
          ]}
        />
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Customer">
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name
            </label>
            <input className="input" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone
            </label>
            <input className="input" placeholder="555-0101" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input type="email" className="input" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Address
            </label>
            <textarea className="input" rows={2} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Add Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Purchase History Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name}'s Purchase History` : ""}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card">
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium truncate">{selected.email}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm font-medium">{selected.phone}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500">Total Spent</p>
                <p className="text-sm font-bold text-primary-600">
                  ${selected.total.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="card">
              <p className="text-sm font-medium mb-3">Recent Orders</p>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">Order #10{i}4</p>
                      <p className="text-xs text-slate-500">2026-09-1{i}</p>
                    </div>
                    <p className="text-sm font-semibold">${(45 * i).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}