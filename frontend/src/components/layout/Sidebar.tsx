import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  FileText,
  BarChart3,
  Menu,
  X,
  Boxes,
  Bell,
  History,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/purchases", label: "Purchases", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/activities", label: "Activity Log", icon: History },
];

let isHydrated = false;

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState(() => {
    if (typeof window !== "undefined" && isHydrated) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          return JSON.parse(storedUser).role;
        } catch (e) {}
      }
    }
    return "admin"; // Default doesn't matter much on first load because we hide nav until mounted
  });
  const [mounted, setMounted] = useState(() => {
    if (typeof window !== "undefined") {
      return isHydrated;
    }
    return false;
  });

  useEffect(() => {
    if (!isHydrated) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setUserRole(user.role);
        } catch (e) {}
      }
      setMounted(true);
      isHydrated = true;
    }
  }, []);
  const pathname = usePathname();

  const allowedStaffPages = [
    "/dashboard",
    "/products",
    "/pos",
    "/inventory",
    "/purchases",
    "/suppliers",
    "/reports"
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (userRole === "admin") return true;
    return allowedStaffPages.includes(item.href);
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-primary-600 text-white p-2.5 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        suppressHydrationWarning
        className={`
    fixed lg:sticky top-0 left-0 h-screen w-64
    bg-slate-900 text-slate-100 z-40
    transform transition-transform duration-300 ease-in-out
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
    lg:translate-x-0
  `}
      >
        {/* Brand */}
        <div className="p-4 sm:p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
              <Boxes size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                InventoryMS
              </h1>
              <p className="text-[11px] text-slate-400">
                Business Manager
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 sm:p-4 space-y-1 overflow-y-auto h-[calc(100%-88px)]">
          {mounted && filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium
                  transition-colors min-h-[48px]
                  ${
                    isActive
                      ? "bg-primary-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }
                `}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}