import { useEffect, useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import Modal from "@/src/components/ui/Modal";
import { customersApi } from "@/src/lib/api";
import type { Customer, CustomerPurchase } from "@/src/lib/api";
import { Search, Plus, Loader2 } from "lucide-react";
import Pagination from "@/src/components/ui/Pagination";
import { useUrlPagination } from "@/src/hooks/useUrlPagination";
import { useToast } from "@/src/context/ToastContext";

const toCurrency = (v: string | number) =>
  `$${Number(v || 0).toFixed(2)}`;

const EMPTY_FORM = { name: "", phone: "", email: "", address: "" };

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [loadError, setLoadError] = useState("");
  const { page, limit, setPage, setLimit } = useUrlPagination(20);
  const { showToast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<CustomerPurchase[] | null>(null);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function loadCustomers() {
    try {
      const res = await customersApi.list({ search: debouncedSearch, page, limit });
      setCustomers(res.customers);
      setTotalItems((res as any).pagination?.total || res.customers?.length || 0);
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load customers.");
    }
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, limit]);

  async function openPurchases(customer: Customer) {
    setSelected(customer);
    setPurchases(null);
    try {
      const res = await customersApi.purchases(customer.id, { limit: 5 });
      setPurchases(res.purchases);
    } catch {
      setPurchases([]); // purchase history is admin-only - a 403 here just shows "no purchases"
    }
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    if (!form.name.trim()) {
      setFormErrors({ name: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      await customersApi.create(form);
      setAddOpen(false);
      setForm(EMPTY_FORM);
      showToast("Customer added successfully", "success");
      await loadCustomers();
    } catch (err: any) {
      if (err?.details && typeof err.details === "object") setFormErrors(err.details);
      else setFormErrors({ _form: err instanceof Error ? err.message : "Could not add customer." });
      showToast("Failed to add customer", "fail");
    } finally {
      setSaving(false);
    }
  }

  const list = customers ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Customers</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage customers and view purchase history
            </p>
          </div>
          <button onClick={() => setAddOpen(true)} className="btn-primary w-full sm:w-auto">
            <Plus size={18} />
            Add Customer
          </button>
        </div>

        <div className="card">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {loadError && (
          <div className="card bg-red-50 text-red-700 text-sm flex items-center justify-between">
            <span>{loadError}</span>
            <button onClick={loadCustomers} className="underline font-medium">
              Try again
            </button>
          </div>
        )}

        {customers === null && !loadError ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-primary-500" size={28} />
            <p className="text-sm text-slate-500 mt-3">Loading customers...</p>
          </div>
        ) : (
          <ResponsiveTable
            data={list}
            keyField="id"
            columns={[
              { key: "name", label: "Name" },
              { key: "phone", label: "Phone", render: (r) => r.phone || "-" },
              { key: "email", label: "Email", hideOnMobile: true, render: (r) => r.email || "-" },
              { key: "address", label: "Address", hideOnMobile: true, render: (r) => r.address || "-" },
              {
                key: "orders",
                label: "Orders",
                render: (r) => (
                  <button
                    onClick={() => openPurchases(r)}
                    className="text-primary-600 hover:underline font-medium"
                  >
                    View
                  </button>
                ),
              },
              {
                key: "total_spending",
                label: "Total Spent",
                render: (r) => <span className="font-semibold">{toCurrency(r.total_spending)}</span>,
              },
            ]}
          />
        )}
        
        {list.length > 0 && (
          <Pagination
            page={page}
            limit={limit}
            totalItems={totalItems}
            totalPages={Math.ceil(totalItems / limit)}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Customer">
        <form className="space-y-4" onSubmit={submitAdd}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input
              className="input"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {formErrors.name && <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <input
              className="input"
              placeholder="555-0101"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            {formErrors.phone && <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              className="input"
              placeholder="john@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {formErrors.email && <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <textarea
              className="input"
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          {formErrors._form && <p className="text-sm text-red-600">{formErrors._form}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto disabled:opacity-60">
              {saving ? "Saving..." : "Add Customer"}
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
                <p className="text-sm font-medium truncate">{selected.email || "-"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm font-medium">{selected.phone || "-"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500">Total Spent</p>
                <p className="text-sm font-bold text-primary-600">{toCurrency(selected.total_spending)}</p>
              </div>
            </div>
            <div className="card">
              <p className="text-sm font-medium mb-3">Recent Orders</p>
              {purchases === null ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : purchases.length === 0 ? (
                <p className="text-sm text-slate-500">No purchases yet.</p>
              ) : (
                <div className="space-y-2">
                  {purchases.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.invoice_number || `Sale #${p.id}`}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(p.created_at).toLocaleDateString()} - {p.status}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{toCurrency(p.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

