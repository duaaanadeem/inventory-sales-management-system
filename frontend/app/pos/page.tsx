"use client";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

const products: Product[] = [
  { id: 1, name: "Wireless Mouse", price: 25.99, stock: 36, category: "Accessories" },
  { id: 2, name: "Mechanical Keyboard", price: 89.99, stock: 15, category: "Accessories" },
  { id: 3, name: "USB-C Hub", price: 45.0, stock: 8, category: "Accessories" },
  { id: 4, name: 'Monitor 24"', price: 199.99, stock: 12, category: "Displays" },
  { id: 5, name: "Laptop Stand", price: 35.5, stock: 22, category: "Accessories" },
  { id: 6, name: "Webcam HD", price: 65.0, stock: 5, category: "Electronics" },
  { id: 7, name: "Headphones", price: 120.0, stock: 18, category: "Audio" },
  { id: 8, name: "Mousepad XL", price: 15.0, stock: 40, category: "Accessories" },
];

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(0);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
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
  const tax = (subtotal - discountAmt) * 0.1;
  const total = subtotal - discountAmt + tax;

  return (
    <DashboardLayout>
      {/* Full-height POS layout inside the shell */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:h-[calc(100vh-140px)]">
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
              {filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm
                             p-2.5 sm:p-3 text-left flex flex-col
                             hover:border-primary-500 hover:shadow-md
                             active:scale-[0.97] transition-all overflow-hidden"
                >
                  {/* Image / placeholder — FIXED height */}
                  <div className="w-full h-24 sm:h-28 bg-slate-100 rounded-lg flex items-center justify-center mb-2 shrink-0">
                    <ShoppingCart size={28} className="text-slate-300" />
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
                      onClick={() => updateQty(item.id, 1)}
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
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
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
                <span className="text-gray-600">Tax (10%)</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["Cash", "Card", "Online"].map((method) => (
                <button
                  key={method}
                  className="btn-secondary text-xs sm:text-sm py-2.5"
                >
                  {method}
                </button>
              ))}
            </div>

            <button
              disabled={cart.length === 0}
              className="btn-primary w-full text-base font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete Sale
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}