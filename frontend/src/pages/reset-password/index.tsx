import AuthLayout from "@/src/components/layout/AuthLayout";
import Link from "next/link";
import { useState } from "react";
import { Boxes, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
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
        <Link href="/login" className="btn-primary w-full">
          Back to Login
        </Link>
      </div>
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
          className="space-y-4"
        >
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

          <button type="submit" className="btn-primary w-full">
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