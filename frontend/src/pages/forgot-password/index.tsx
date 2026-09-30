import AuthLayout from "@/src/components/layout/AuthLayout";
import Link from "next/link";
import { useState } from "react";
import { Boxes, Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      
      if (data.success) {
        setSent(true);
      } else {
        setError(data.message || "Failed to send reset link.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
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
            Forgot Password?
          </h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleForgot} className="space-y-4">
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

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
    </AuthLayout>
  );
}