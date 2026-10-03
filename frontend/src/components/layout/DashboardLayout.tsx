import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "./Sidebar";
import Header from "./Header";

const allowedStaffPages = [
  "/dashboard",
  "/products",
  "/pos",
  "/inventory",
  "/purchases",
  "/suppliers",
  "/reports"
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = router.pathname;
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      let role = "admin";
      if (storedUser) {
        try {
          role = JSON.parse(storedUser).role;
        } catch (e) {}
      }
      if (role === "staff") {
        const isAllowed = allowedStaffPages.some(page => pathname === page || pathname.startsWith(page + "/"));
        if (!isAllowed) {
          router.push("/dashboard");
        }
      }
    }
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 container-responsive py-4 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

