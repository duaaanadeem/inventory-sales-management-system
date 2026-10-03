import { useState, useEffect } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import Modal from "@/src/components/ui/Modal";
import { Search, Plus, Loader2 } from "lucide-react";
import apiClient from "@/src/lib/apiClient";
import { useToast } from "@/src/context/ToastContext";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { showToast } = useToast();

  // History State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierHistory, setSupplierHistory] = useState<{ summary: any; orders: any[] } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/suppliers");
      const data = res.data;
      if (data.success) {
        setSuppliers(data.data);
      } else {
        setError(data.message || "Failed to fetch suppliers");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await apiClient.post("/suppliers", { name, company, phone, email, address });
      const data = res.data;
      if (data.success) {
        setAddOpen(false);
        setName("");
        setCompany("");
        setPhone("");
        setEmail("");
        setAddress("");
        showToast("Supplier added successfully", "success");
        fetchSuppliers();
      } else {
        setError(data.message || "Failed to add supplier");
        showToast(data.message || "Failed to add supplier", "fail");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Unable to connect to the server.";
      setError(msg);
      showToast(msg, "fail");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = async (supplier: any) => {
    setSelectedSupplier(supplier);
    setHistoryOpen(true);
    setIsLoadingHistory(true);
    setSupplierHistory(null);
    try {
      const res = await apiClient.get(`/suppliers/${supplier.id}/summary`);
      const data = res.data;
      if (data.success) {
        setSupplierHistory(data.data);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load supplier history", "fail");
    } finally {
      setIsLoadingHistory(false);
    }
  };

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

        {error && !addOpen && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-lg text-sm border border-rose-200">
            {error}
          </div>
        )}

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

        {isLoading ? (
          <div className="card flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="ml-3 text-slate-500 font-medium">Loading suppliers...</span>
          </div>
        ) : (
          <ResponsiveTable
            data={filtered}
            keyField="id"
            columns={[
              { key: "name", label: "Supplier" },
              { key: "company", label: "Company" },
              { key: "phone", label: "Phone", hideOnMobile: true },
              { key: "email", label: "Email", hideOnMobile: true },
              { key: "address", label: "Address", hideOnMobile: true },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <button
                    onClick={() => handleViewHistory(row)}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded-md"
                  >
                    View History
                  </button>
                ),
              }
            ]}
          />
        )}
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Supplier">
        <form className="space-y-4" onSubmit={handleAddSupplier}>
          {error && addOpen && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Supplier Name
            </label>
            <input 
              className="input" 
              placeholder="Acme Supplies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Company
            </label>
            <input 
              className="input" 
              placeholder="Acme Corp" 
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone
            </label>
            <input 
              className="input" 
              placeholder="555-0201"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input 
              type="email" 
              className="input" 
              placeholder="sales@acme.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Address
            </label>
            <textarea 
              className="input" 
              rows={2} 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="btn-secondary w-full sm:w-auto"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Supplier
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title={`History: ${selectedSupplier?.name || ""}`}>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : supplierHistory ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                <p className="text-xs font-medium text-slate-500 mb-1">Total Spent</p>
                <p className="text-lg font-bold text-slate-900">${parseFloat(supplierHistory.summary.total_spent).toFixed(2)}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg">
                <p className="text-xs font-medium text-rose-500 mb-1">Amount Unpaid</p>
                <p className="text-lg font-bold text-rose-700">${parseFloat(supplierHistory.summary.total_unpaid).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                <p className="text-xs font-medium text-slate-500 mb-1">Total Orders</p>
                <p className="text-lg font-bold text-slate-900">{supplierHistory.summary.total_orders}</p>
              </div>
            </div>

            {supplierHistory.orders.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600">PO #</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Total</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierHistory.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">PO-{order.id.toString().padStart(4, '0')}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(order.purchase_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">${parseFloat(order.total_cost).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : 
                            order.payment_status === "partial" ? "bg-blue-100 text-blue-700" :
                            "bg-rose-100 text-rose-700"
                          }`}>
                            {order.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                No purchase orders found for this supplier.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-rose-500 text-sm">
            Failed to load history.
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}