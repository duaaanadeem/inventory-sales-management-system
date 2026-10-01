import { useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import Modal from "@/src/components/ui/Modal";
import { Search, Plus, Building2, Phone, Mail } from "lucide-react";

const suppliers = [
  { id: 1, name: "Acme Supplies", company: "Acme Corp", phone: "555-0201", email: "sales@acme.com", products: "Mice, Keyboards", status: "Active", total: 12500 },
  { id: 2, name: "TechSource", company: "TechSource Inc", phone: "555-0202", email: "info@techsource.com", products: "Monitors, Hubs", status: "Active", total: 8400 },
  { id: 3, name: "Global Gadgets", company: "Global Gadgets Ltd", phone: "555-0203", email: "contact@globalgadgets.com", products: "Headphones, Webcams", status: "Pending", total: 2100 },
];

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Suppliers
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage suppliers and their products
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>

        <div className="card">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <ResponsiveTable
          data={filtered}
          keyField="id"
          columns={[
            { key: "name", label: "Supplier" },
            { key: "company", label: "Company" },
            { key: "phone", label: "Phone", hideOnMobile: true },
            { key: "email", label: "Email", hideOnMobile: true },
            { key: "products", label: "Products Supplied", hideOnMobile: true },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    r.status === "Active"
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

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Supplier">
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Supplier Name
            </label>
            <input className="input" placeholder="Acme Supplies" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Company
            </label>
            <input className="input" placeholder="Acme Corp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone
            </label>
            <input className="input" placeholder="555-0201" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input type="email" className="input" placeholder="sales@acme.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Address
            </label>
            <textarea className="input" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Products Supplied
            </label>
            <input className="input" placeholder="Mice, Keyboards" />
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
              Add Supplier
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}