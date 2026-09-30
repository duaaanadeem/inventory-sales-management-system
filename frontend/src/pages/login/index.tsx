import AuthLayout from "@/src/components/layout/AuthLayout";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { Boxes, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "staff">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Essential for storing cookies
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (data.success) {
        // Redirect to dashboard (or wherever)
        router.push("/dashboard");
      } else {
        setError(data.message || "Failed to log in.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-3">
            <Boxes size={26} className="text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to InventoryMS
          </p>
        </div>

        {/* Role toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-5">
          {(["admin", "staff"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2 rounded-md text-sm font-medium transition-colors capitalize min-h-[40px] ${
                role === r
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                placeholder="you@example.com"
                className="input pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="input pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In as {role === "admin" ? "Admin" : "Staff"}
          </button>
        </form>

        {/* Signup link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}