import AuthLayout from "@/src/components/layout/AuthLayout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Boxes, Lock, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import apiClient from "@/src/lib/apiClient";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const token = router.query.token as string;
  const email = router.query.email as string;

  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (router.isReady) {
      setIsReady(true);
    }
  }, [router.isReady]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token || !email) {
      setError("Invalid reset link. Missing token or email.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await apiClient.post("/auth/reset-password", { email, token, newPassword: password });
      const data = res.data;
      
      if (data.success) {
        setDone(true);
      } else {
        setError(data.message || "Failed to reset password.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return (
      <AuthLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={26} className="text-emerald-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Password Reset
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Link href="/login" className="btn-primary w-full inline-block">
            Back to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-3">
            <Boxes size={26} className="text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Reset Password
          </h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
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

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                className="input pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Toggle confirm visibility"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Reset Password
          </button>
        </form>

        <Link
          href="/login"
          className="block text-center text-sm text-slate-500 hover:text-slate-700 mt-6"
        >
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
}