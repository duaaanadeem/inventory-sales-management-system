import { useState, useEffect } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import Modal from "@/src/components/ui/Modal";
import { Search, Plus, Loader2, CheckCircle } from "lucide-react";
import apiClient from "@/src/lib/apiClient";
import { useToast } from "@/src/context/ToastContext";
import Pagination from "@/src/components/ui/Pagination";
import { useUrlPagination } from "@/src/hooks/useUrlPagination";

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [newOpen, setNewOpen] = useState(false);

  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const { showToast } = useToast();
  
  const { page, limit, setPage, setLimit } = useUrlPagination(20);
  const [totalItems, setTotalItems] = useState(0);
  
  // New PO Form State
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cost, setCost] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);

  // Damage Report Modal State
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [damageTargetId, setDamageTargetId] = useState<number | null>(null);
  const [damageItems, setDamageItems] = useState<{ product_id: number; name: string; quantity: number; damaged_qty: number }[]>([]);
  const [isFetchingItems, setIsFetchingItems] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        apiClient.get(`/purchases?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}&page=${page}&limit=${limit}`),
        apiClient.get("/suppliers"),
        apiClient.get("/products")
      ]);

      const purchasesData = purchasesRes.data;
      const suppliersData = suppliersRes.data;
      const productsData = productsRes.data;

      if (purchasesData.success) {
        setPurchases(purchasesData.data || []);
        setTotalItems(purchasesData.pagination?.total || purchasesData.data?.length || 0);
      }
      if (suppliersData.success) {
        setSuppliers(suppliersData.data);
        if (suppliersData.data.length > 0 && !supplierId) setSupplierId(suppliersData.data[0].id);
      }
      if (productsData.success) {
        setProducts(productsData.data);
        if (productsData.data.length > 0 && !productId) setProductId(productsData.data[0].id);
      }
    } catch (err) {
      setError("Unable to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page, limit]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        supplier_id: parseInt(supplierId),
        purchase_date: purchaseDate,
        items: [
          {
            product_id: parseInt(productId),
            quantity: parseInt(quantity.toString()),
            cost: parseFloat(cost.toString())
          }
        ]
      };

      const res = await apiClient.post("/purchases", payload);
      const data = res.data;
      
      if (data.success) {
        setNewOpen(false);
        setQuantity(1);
        setCost(0);
        setPurchaseDate("");
        showToast("Purchase order created", "success");
        fetchData();
      } else {
        setError(data.message || "Failed to create PO");
        showToast(data.message || "Failed to create PO", "fail");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Unable to connect to the server.";
      setError(msg);
      showToast(msg, "fail");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDamageModal = async (id: number) => {
    setDamageTargetId(id);
    setDamageModalOpen(true);
    setIsFetchingItems(true);
    setError("");

    try {
      const res = await apiClient.get(`/purchases/${id}/items`);
      const data = res.data;
      if (data.success) {
        setDamageItems(
          data.data.map((item: any) => ({
            ...item,
            damaged_qty: 0
          }))
        );
      } else {
        setError(data.message || "Failed to fetch purchase items");
        setDamageModalOpen(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to connect to the server.");
      setDamageModalOpen(false);
    } finally {
      setIsFetchingItems(false);
    }
  };

  const handleCompletePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageTargetId) return;
    
    setCompletingId(damageTargetId);
    setError("");
    
    // validate damaged items
    const hasInvalid = damageItems.some(i => i.damaged_qty < 0 || i.damaged_qty > i.quantity);
    if (hasInvalid) {
      setError("Damaged quantity cannot exceed ordered quantity or be less than zero.");
      setCompletingId(null);
      return;
    }
    
    try {
      const damaged_items = damageItems
        .filter(i => i.damaged_qty > 0)
        .map(i => ({ product_id: i.product_id, damaged_qty: i.damaged_qty }));

      const res = await apiClient.put(`/purchases/${damageTargetId}/complete`, { damaged_items });
      const data = res.data;
      
      if (data.success) {
        setDamageModalOpen(false);
        showToast("Purchase order marked as complete", "success");
        fetchData(); // Refresh list
      } else {
        setError(data.message || "Failed to complete purchase");
        showToast(data.message || "Failed to complete purchase", "fail");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Unable to connect to the server.";
      setError(msg);
      showToast(msg, "fail");
    } finally {
      setCompletingId(null);
    }
  };

  const filtered = purchases; // Handled by backend

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

        {error && !newOpen && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-lg text-sm border border-rose-200">
            {error}
          </div>
        )}

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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>Paid</option>
            <option>Pending</option>
          </select>
        </div>

        {isLoading ? (
          <div className="card flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="ml-3 text-slate-500 font-medium">Loading purchases...</span>
          </div>
        ) : (
          <ResponsiveTable
            data={filtered}
            keyField="id"
            columns={[
              { 
                key: "po", 
                label: "PO #",
                render: (r) => <span className="font-medium text-slate-900">PO-{r.id.toString().padStart(4, '0')}</span> 
              },
              { key: "supplier_name", label: "Supplier" },
              { 
                key: "purchase_date", 
                label: "Date",
                render: (r) => new Date(r.purchase_date).toLocaleDateString()
              },
              {
                key: "total_cost",
                label: "Total",
                render: (r) => (
                  <span className="font-semibold">${parseFloat(r.total_cost).toFixed(2)}</span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (r) => (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      r.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.status === "completed" ? "Paid" : "Pending"}
                  </span>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (r) => (
                  r.status === "pending" && (
                    <button
                      onClick={() => handleOpenDamageModal(r.id)}
                      disabled={isFetchingItems && damageTargetId === r.id}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md disabled:opacity-50"
                    >
                      {isFetchingItems && damageTargetId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle size={14} />}
                      Mark Completed
                    </button>
                  )
                )
              }
            ]}
          />
        )}

        {purchases.length > 0 && (
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

      <Modal
        isOpen={newOpen}
        onClose={() => setNewOpen(false)}
        title="New Purchase Order"
      >
        <form className="space-y-4" onSubmit={handleCreatePO}>
          {error && newOpen && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Supplier
            </label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Product
            </label>
            <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)} required>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Quantity
              </label>
              <input type="number" className="input" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Unit Cost
              </label>
              <input type="number" step="0.01" min="0" className="input" value={cost} onChange={(e) => setCost(Number(e.target.value))} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Purchase Date
            </label>
            <input type="date" className="input" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              className="btn-secondary w-full sm:w-auto"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Damage Report Modal (Mark Completed) */}
      <Modal
        isOpen={damageModalOpen}
        onClose={() => !completingId && setDamageModalOpen(false)}
        title="Complete Purchase & Receive Stock"
      >
        <form className="space-y-4" onSubmit={handleCompletePO}>
          {error && damageModalOpen && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}
          
          <p className="text-sm text-slate-600 mb-4">
            Please verify the received items. If any items arrived damaged, log the damaged quantity below. Damaged items will be recorded separately and subtracted from the current clean stock.
          </p>

          {isFetchingItems ? (
             <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {damageItems.map((item, index) => (
                <div key={item.product_id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between gap-4 bg-slate-50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">Ordered Qty: {item.quantity}</p>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Damaged Qty</label>
                    <input 
                      type="number" 
                      min="0"
                      max={item.quantity}
                      className="input py-1.5 text-sm" 
                      value={item.damaged_qty}
                      onChange={(e) => {
                        const newItems = [...damageItems];
                        newItems[index].damaged_qty = Number(e.target.value) || 0;
                        setDamageItems(newItems);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDamageModalOpen(false)}
              className="btn-secondary w-full sm:w-auto"
              disabled={completingId !== null}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2" disabled={completingId !== null || isFetchingItems}>
              {completingId !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Receipt
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
