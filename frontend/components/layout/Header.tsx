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
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  User,
  Search,
  LogOut,
  ChevronDown,
  Settings,
  LogIn,
  UserPlus,
} from "lucide-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

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
            <button
              className="relative p-2.5 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>

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