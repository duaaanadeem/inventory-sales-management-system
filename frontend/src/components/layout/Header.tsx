// "use client";
// import { Bell, User, Search } from "lucide-react";

// export default function Header() {
//   return (
//     <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
//       <div className="container-responsive py-3 sm:py-4">
//         <div className="flex items-center justify-between gap-3">
//           <div className="lg:hidden w-10" />

//           <div className="hidden sm:flex flex-1 max-w-md">
//             <div className="relative w-full">
//               <Search
//                 size={18}
//                 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
//               />
//               <input
//                 type="search"
//                 placeholder="Search products, customers..."
//                 className="input pl-10 bg-slate-50 border-slate-200"
//               />
//             </div>
//           </div>

//           <div className="flex items-center gap-2 sm:gap-3">
//             <button
//               className="relative p-2.5 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600"
//               aria-label="Notifications"
//             >
//               <Bell size={20} />
//               <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
//             </button>
//             <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 min-h-[44px]">
//               <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
//                 <User size={18} className="text-white" />
//               </div>
//               <span className="hidden md:block text-sm font-medium text-slate-700">
//                 Admin
//               </span>
//             </button>
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// }


"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  User,
  Search,
  LogOut,
  ChevronDown,
  Settings,
  LogIn,
  UserPlus,
  CheckCheck,
  AlertTriangle,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { notifications as mockNotifications, timeAgo } from "@/src/lib/mockData";
import type { AppNotification, NotificationType } from "@/src/lib/mockData";
import { notificationsApi } from "@/src/lib/api";

const bellIcons: Record<NotificationType, { icon: any; color: string }> = {
  low_stock: { icon: AlertTriangle, color: "text-amber-600" },
  new_sale: { icon: ShoppingBag, color: "text-emerald-600" },
  purchase_received: { icon: Truck, color: "text-blue-600" },
  other: { icon: Bell, color: "text-indigo-600" },
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [notifsLoaded, setNotifsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await notificationsApi.list();
        if (!cancelled) setNotifs(data.notifications);
      } catch {
        setNotifs(mockNotifications);
      } finally {
        if (!cancelled) setNotifsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = notifs.filter((n) => !n.isRead).length;
  const recent = [...notifs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const markRead = (id: number) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    notificationsApi.markRead(id).catch(() => {});
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    notificationsApi.markAllRead().catch(() => {});
  };

  const go = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="container-responsive py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="lg:hidden w-10" />

          <div className="hidden sm:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                placeholder="Search products, customers..."
                className="input pl-10 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  {/* Click outside to close */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setNotifOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-[19rem] sm:w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">
                        Notifications
                      </p>
                      <button
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center gap-1"
                      >
                        <CheckCheck size={14} />
                        Mark all read
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {!notifsLoaded ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                          Loading...
                        </div>
                      ) : recent.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                          No notifications
                        </div>
                      ) : (
                        recent.map((n) => {
                          const bell = bellIcons[n.type];
                          const Icon = bell.icon;
                          return (
                            <div
                              key={n.id}
                              onClick={() => markRead(n.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") markRead(n.id);
                              }}
                              className={`flex gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${
                                n.isRead ? "opacity-60" : ""
                              }`}
                            >
                              <div
                                className={`p-2 rounded-lg bg-slate-50 ${bell.color} shrink-0 self-start`}
                              >
                                <Icon size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700">
                                  {n.message}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {mounted ? timeAgo(n.createdAt) : ""}
                                </p>
                              </div>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <Link
                      href="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="block text-center text-sm font-medium text-primary-600 py-3 hover:bg-slate-50"
                    >
                      View all notifications
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 min-h-[44px]"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">
                  Admin
                </span>
                <ChevronDown
                  size={14}
                  className={`hidden md:block text-slate-400 transition-transform ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {menuOpen && (
                <>
                  {/* Click outside to close */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                    <button
                      onClick={() => go("/login")}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center gap-2"
                    >
                      <LogIn size={16} />
                      Login
                    </button>
                    <button
                      onClick={() => go("/signup")}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center gap-2"
                    >
                      <UserPlus size={16} />
                      Sign Up
                    </button>

                    <hr className="my-1 border-slate-100" />

                    <button
                      onClick={() => go("/dashboard")}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center gap-2"
                    >
                      <User size={16} />
                      Profile
                    </button>
                    <button
                      onClick={() => go("/dashboard")}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center gap-2"
                    >
                      <Settings size={16} />
                      Settings
                    </button>

                    <hr className="my-1 border-slate-100" />

                    <button
                      onClick={() => go("/login")}
                      className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 min-h-[44px] flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}