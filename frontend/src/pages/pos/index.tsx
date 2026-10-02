import { useEffect, useState } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string | null;
}

interface CartItem extends Product {
  quantity: number;
}

type PaymentMethod = "cash" | "card" | "online";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SaleResponse {
  sale: { id: number };
  invoice: { invoice_number: string };
}

interface SaleSummary {
  id: number;
  total: number | string;
  payment_method: PaymentMethod;
  status: string;
  created_at: string;
  invoice_number?: string;
  item_count: number;
}

interface SaleDetails extends SaleSummary {
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  customer_name?: string | null;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    unit_price: number | string;
    line_total: number | string;
  }>;
}

interface InvoiceResponse {
  invoice: {
    id: number;
    invoiceNumber: string;
    pdfUrl?: string | null;
    createdAt: string;
  };
  sale: SaleDetails;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const TAX_RATE = Number(process.env.NEXT_PUBLIC_TAX_RATE || 0);

const getErrorMessage = (response: ApiResponse<unknown>) =>
  response.error || "The request could not be completed.";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse["invoice"] | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingSaleDetails, setIsLoadingSaleDetails] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = window.localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadSales = async () => {
    setIsLoadingSales(true);
    try {
      const response = await fetch(`${API_URL}/sales`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<SaleSummary[]> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(getErrorMessage(result));
      }
      setSales(result.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load sales history."
      );
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    void loadSales();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/sales/products/search?q=${encodeURIComponent(search)}`,
          { signal: controller.signal }
        );
        const result: ApiResponse<
          Array<{
            id: number;
            sku: string;
            name: string;
            price: number | string;
            image_url: string | null;
            current_stock: number | string | null;
            category_name?: string | null;
          }>
        > = await response.json();

        if (!response.ok || !result.success || !result.data) {
          throw new Error(getErrorMessage(result));
        }

        setProducts(
          result.data.map((product) => ({
            id: product.id,
            sku: product.sku,
            name: product.name,
            price: Number(product.price),
            stock: Number(product.current_stock || 0),
            category: product.category_name || "Uncategorized",
            image_url: product.image_url,
          }))
        );
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load products."
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setError("");
    setSuccessMessage("");
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing && existing.quantity >= product.stock) return prev;
      if (!existing && product.stock < 1) return prev;
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmt = (subtotal * discount) / 100;
  const tax = (subtotal - discountAmt) * (TAX_RATE / 100);
  const total = subtotal - discountAmt + tax;

  const completeSale = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          paymentMethod,
          discount: discountAmt.toFixed(2),
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });
      const result: ApiResponse<SaleResponse> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(getErrorMessage(result));
      }

      setCart([]);
      setDiscount(0);
      setSuccessMessage(
        `Sale #${result.data.sale.id} completed. Invoice ${result.data.invoice.invoice_number}.`
      );
      setSearch("");
      await loadSales();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete sale."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewSale = async (saleId: number) => {
    setIsLoadingSaleDetails(true);
    setSelectedInvoice(null);
    setError("");

    try {
      const response = await fetch(`${API_URL}/sales/${saleId}`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<SaleDetails> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(getErrorMessage(result));
      }
      setSelectedSale(result.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load sale details."
      );
    } finally {
      setIsLoadingSaleDetails(false);
    }
  };

  const viewInvoice = async (saleId: number) => {
    setError("");

    try {
      const response = await fetch(`${API_URL}/sales/${saleId}/invoice`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<InvoiceResponse> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(getErrorMessage(result));
      }
      setSelectedInvoice(result.data.invoice);
      setSelectedSale(result.data.sale);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load invoice."
      );
    }
  };

  return (
    <DashboardLayout>
      {/* Full-height POS layout inside the shell */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:h-[calc(100vh-140px)]">
        {(error || successMessage) && (
          <div
            className={`fixed top-4 right-4 z-10 max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg ${
              error
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
            role="alert"
          >
            {error || successMessage}
          </div>
        )}
        {/* LEFT — Products */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search */}
          <div className="relative mb-3 sm:mb-4">
            <Search
              size={20}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-11 text-base"
            />
          </div>

          {/* Scrollable product grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-2">
              {isLoading ? (
                <div className="col-span-full py-12 text-center text-sm text-slate-500">
                  Loading products...
                </div>
              ) : filtered.length === 0 ? (
                <div className="col-span-full py-12 text-center text-sm text-slate-500">
                  No products found.
                </div>
              ) : filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock < 1}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm
                             p-2.5 sm:p-3 text-left flex flex-col
                             hover:border-primary-500 hover:shadow-md
                             active:scale-[0.97] transition-all overflow-hidden
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* Image / placeholder — FIXED height */}
                  <div className="w-full h-24 sm:h-28 bg-slate-100 rounded-lg flex items-center justify-center mb-2 shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={`${API_BASE_URL}${product.image_url}`} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart size={28} className="text-slate-300" />
                    )}
                  </div>

                  {/* Product name — clamped */}
                  <p
                    className="font-medium text-xs sm:text-sm text-slate-900 leading-tight h-8 sm:h-9 overflow-hidden break-words"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {product.name}
                  </p>

                  {/* Price + stock */}
                  <div className="flex items-center justify-between gap-1 mt-1.5">
                    <p className="text-primary-600 font-bold text-sm sm:text-base leading-none">
                      ${product.price.toFixed(2)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-400 leading-none shrink-0">
                      Stock: {product.stock}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Cart */}
        <div className="w-full lg:w-96 xl:w-[420px] bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col lg:h-full">
          {/* Cart header */}
          <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <ShoppingCart size={16} />
              </div>
              Cart
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {cart.length} items
              </span>
            </h2>

            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-red-500 text-sm hover:underline min-h-[44px] px-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 max-h-64 lg:max-h-none">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Cart is empty. Tap products to add.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      ${item.price.toFixed(2)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-300 hover:bg-gray-100 active:scale-95 transition-transform"
                      aria-label="Decrease"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-medium text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={item.quantity >= item.stock}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-300 hover:bg-gray-100 active:scale-95 transition-transform"
                      aria-label="Increase"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <p className="font-semibold text-sm w-16 text-right">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart summary */}
          <div className="border-t border-gray-200 p-3 sm:p-4 space-y-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discount}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setDiscount(
                    Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
                  );
                }}
                className="input py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discount}%)</span>
                  <span>-${discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({TAX_RATE}%)</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["cash", "card", "online"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  type="button"
                  className={`btn-secondary text-xs sm:text-sm py-2.5 ${
                    paymentMethod === method
                      ? "ring-2 ring-primary-500 bg-primary-50"
                      : ""
                  }`}
                >
                  {method[0].toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>

            <button
              disabled={cart.length === 0}
              onClick={completeSale}
              type="button"
              className="btn-primary w-full text-base font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Completing..." : "Complete Sale"}
            </button>
          </div>
        </div>
      </div>
      <section className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Receipt size={18} className="text-primary-600" />
            Sales history
          </h2>
          <button
            type="button"
            onClick={() => void loadSales()}
            disabled={isLoadingSales}
            className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
          >
            <RefreshCw size={15} className={isLoadingSales ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {isLoadingSales ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading sales...</p>
        ) : sales.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No sales found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Sale</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-4 py-3 font-medium">#{sale.id}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize">{sale.payment_method}</td>
                    <td className="px-4 py-3">{sale.item_count}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${Number(sale.total).toFixed(2)}
                    </td>
                    <td className="space-x-2 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void viewSale(sale.id)}
                        className="text-primary-600 hover:underline"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void viewInvoice(sale.id)}
                        className="text-primary-600 hover:underline"
                      >
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(isLoadingSaleDetails || selectedSale || selectedInvoice) && (
          <div className="border-t border-gray-200 bg-slate-50 p-4">
            {isLoadingSaleDetails ? (
              <p className="text-sm text-slate-500">Loading sale details...</p>
            ) : selectedSale ? (
              <div>
                <h3 className="font-semibold text-slate-900">
                  Sale #{selectedSale.id}
                  {selectedInvoice && ` - ${selectedInvoice.invoiceNumber}`}
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selectedSale.items.map((item) => (
                    <div key={item.id} className="rounded-md bg-white p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span>{item.name} x {item.quantity}</span>
                        <span className="font-medium">
                          ${Number(item.line_total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedInvoice?.pdfUrl && (
                  <a
                    href={selectedInvoice.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm text-primary-600 hover:underline"
                  >
                    Open invoice PDF
                  </a>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}