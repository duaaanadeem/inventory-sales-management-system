"use client";
import Link from "next/link";
import { useState } from "react";
import { Boxes, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={26} className="text-emerald-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          Check Your Email
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          We&apos;ve sent a password reset link to your email address.
        </p>
        <Link href="/login" className="btn-primary w-full">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-3">
          <Boxes size={26} className="text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Forgot Password?
        </h1>
        <p className="text-sm text-slate-500 mt-1 text-center">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
        className="space-y-4"
      >
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
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">
          Send Reset Link
        </button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 mt-6"
      >
        <ArrowLeft size={14} />
        Back to Login
      </Link>
    </div>
  );
}