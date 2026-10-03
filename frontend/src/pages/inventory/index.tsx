import { useState, useEffect } from "react";
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
  Loader2
} from "lucide-react";
import apiClient from "@/src/lib/apiClient";
import { useToast } from "@/src/context/ToastContext";
import Pagination from "@/src/components/ui/Pagination";
import { useUrlPagination } from "@/src/hooks/useUrlPagination";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState("All");
  const [adjustOpen, setAdjustOpen] = useState(false);

  // Dynamic state
  const [inventory, setInventory] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_products: 0, total_stock_items: 0, low_stock_count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { showToast } = useToast();
  
  const { page, limit, setPage, setLimit } = useUrlPagination(20);
  const [totalItems, setTotalItems] = useState(0);

  // Modal form state
  const [productId, setProductId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("stock-in");
  const [quantity, setQuantity] = useState(1);
  const [referenceId, setReferenceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, sumRes] = await Promise.all([
        apiClient.get(`/inventory?search=${encodeURIComponent(search)}&viewFilter=${encodeURIComponent(viewFilter)}&page=${page}&limit=${limit}`),
        apiClient.get("/inventory/summary")
      ]);
      
      const invData = invRes.data.data;
      setInventory(invData.inventory || []);
      setTotalItems(invData.pagination?.total || invData.inventory?.length || 0);
      setSummary(sumRes.data.data || { total_products: 0, total_stock_items: 0, low_stock_count: 0 });
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      setError("Unable to connect to the backend server. Please make sure it is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, viewFilter, page, limit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return alert("Please select a product");

    setIsSubmitting(true);
    let endpoint = "";
    if (adjustmentType === "stock-in") endpoint = "/inventory/stock-in";
    else if (adjustmentType === "stock-out") endpoint = "/inventory/deduct";
    else if (adjustmentType === "damaged") endpoint = "/inventory/damage";
    else if (adjustmentType === "adjustment") endpoint = "/inventory/adjust";

    try {
      const res = await apiClient.post(endpoint, {
        product_id: parseInt(productId),
        qty: parseInt(quantity.toString()),
        reference_id: referenceId || `${adjustmentType}_${Date.now()}`
      });

      setAdjustOpen(false);
      setProductId("");
      setQuantity(1);
      setReferenceId("");
      showToast("Stock adjusted successfully", "success");
      fetchData(); // re-fetch data instantly
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || "Failed to adjust stock";
      showToast(msg, "fail");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = inventory; // Filtered and sorted by backend

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
            disabled={isLoading}
          >
            <Plus size={18} />
            Stock Adjustment
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-500">Loading inventory data...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-lg border border-slate-200">
            <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
            <p className="text-lg font-medium text-slate-900">Connection Error</p>
            <p className="text-slate-500 max-w-md">{error}</p>
            <button onClick={fetchData} className="mt-4 btn-primary">Try Again</button>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Items</p>
                    <p className="text-lg font-bold text-slate-900">{summary.total_products || inventory.length}</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <ArrowDownToLine size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total In (Opening)</p>
                    <p className="text-lg font-bold text-slate-900">
                      {inventory.reduce((s, i) => s + (i.opening || 0), 0)}
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
                      {inventory.reduce((s, i) => s + (i.sold || 0) + (i.damaged || 0), 0)}
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
                    <p className="text-lg font-bold text-slate-900">{summary.low_stock_count}</p>
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
              <select
                className="input sm:w-48"
                value={viewFilter}
                onChange={(e) => setViewFilter(e.target.value)}
              >
                <option value="All">All Items</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Damaged">Damaged Stock</option>
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

            {inventory.length > 0 && (
              <Pagination
                page={page}
                limit={limit}
                totalItems={totalItems}
                totalPages={Math.ceil(totalItems / limit)}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            )}
          </>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Stock Adjustment"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Product
            </label>
            <select 
              className="input" 
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="" disabled>Select a product...</option>
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Adjustment Type
            </label>
            <select 
              className="input"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value)}
            >
              <option value="stock-in">Stock In</option>
              <option value="stock-out">Stock Out</option>
              <option value="damaged">Damaged</option>
              <option value="adjustment">Manual Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Quantity
            </label>
            <input 
              type="number" 
              className="input" 
              min={adjustmentType === "adjustment" ? "-99999" : "1"}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reason / Reference ID (Optional)
            </label>
            <input 
              type="text"
              className="input" 
              placeholder="e.g. invoice_123 or leave blank"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => setAdjustOpen(false)}
              className="btn-secondary w-full sm:w-auto"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
