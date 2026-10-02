"use client";
import { useEffect, useState, useTransition } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import Modal from "@/src/components/ui/Modal";
import ProductForm from "@/src/components/forms/ProductForm";
import { API_BASE_URL, createProduct, deleteProduct, getCategories, getProducts, type Category, type Product, type ProductPayload } from "@/lib/api";
import { ImageIcon, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        getProducts({ search, category }),
        getCategories(),
      ]);
      setProducts(productResponse.data);
      setCategories(categoryResponse.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(() => { void loadData(); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, category]);

  const handleCreate = async (payload: ProductPayload) => {
    setIsSubmitting(true);
    setError("");
    try {
      await createProduct(payload);
      setIsModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      setProducts((current) => current.filter((product) => product.id !== id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete product");
    }
  };

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
          <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto">
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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or SKU..."
              className="input pl-10"
            />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="input sm:w-48">
            <option value="">All Categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {isLoading || isPending ? (
          <div className="card flex items-center justify-center gap-2 py-12 text-slate-500"><RefreshCw className="animate-spin" size={18} /> Loading products...</div>
        ) : products.length === 0 ? (
          <div className="card py-12 text-center text-slate-500">No products found.</div>
        ) : <ResponsiveTable<Product>
          data={products}
          keyField="id"
          columns={[
            {
              key: "image_url",
              label: "Image",
              hideOnMobile: true,
              render: (r) => r.image_url ? (
                <img
                  src={`${API_BASE_URL}${r.image_url}`}
                  alt={r.name}
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400" aria-label="No product image">
                  <ImageIcon size={18} />
                </span>
              ),
            },
            { key: "name", label: "Product Name" },
            { key: "sku", label: "SKU" },
            { key: "category_name", label: "Category", hideOnMobile: true },
            {
              key: "price",
              label: "Price",
              render: (r) => `$${Number(r.price).toFixed(2)}`,
            },
            {
              key: "cost",
              label: "Cost",
              hideOnMobile: true,
              render: (r) => `$${Number(r.cost).toFixed(2)}`,
            },
            {
              key: "current_stock",
              label: "Stock",
              render: (r) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    Number(r.current_stock) <= Number(r.min_stock_level)
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {r.current_stock}
                </span>
              ),
            },
            {
              key: "actions",
              label: "",
              render: (r) => <button onClick={() => void handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600" aria-label={`Delete ${r.name}`}><Trash2 size={17} /></button>,
            },
          ]}
        />}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Product">
        <ProductForm categories={categories} onSubmit={handleCreate} onCancel={() => setIsModalOpen(false)} isSubmitting={isSubmitting} />
      </Modal>
    </DashboardLayout>
  );
}