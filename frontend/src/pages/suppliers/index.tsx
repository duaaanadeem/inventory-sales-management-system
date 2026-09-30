import { useState, useEffect } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import Modal from "@/src/components/ui/Modal";
import { Search, Plus, Loader2 } from "lucide-react";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const res = await fetch("http://localhost:5000/api/suppliers");
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data);
      } else {
        setError(data.message || "Failed to fetch suppliers");
      }
    } catch (err) {
      setError("Unable to connect to the server.");
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
      const res = await fetch("http://localhost:5000/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, phone, email, address }),
      });
      const data = await res.json();
      if (data.success) {
        setAddOpen(false);
        setName("");
        setCompany("");
        setPhone("");
        setEmail("");
        setAddress("");
        fetchSuppliers();
      } else {
        setError(data.message || "Failed to add supplier");
      }
    } catch (err) {
      setError("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
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
    </DashboardLayout>
  );
}