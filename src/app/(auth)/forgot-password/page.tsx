"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink mb-1">Check your email</h1>
          <p className="text-ink-2 text-sm">We sent a password reset link to <strong className="text-ink">{email}</strong></p>
        </div>
        <div className="bg-canvas-3 rounded-xl p-4 text-sm text-ink-2 leading-relaxed mb-6">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <button
            onClick={() => { setSent(false); setEmail(""); }}
            className="text-orange font-medium hover:underline"
          >
            try a different email
          </button>.
        </div>
        <Link
          href="/login"
          className="text-sm text-ink-2 hover:text-ink transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Forgot password?</h1>
        <p className="text-ink-2 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-ink font-medium text-sm">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-line focus:border-navy focus:ring-navy h-11"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-orange hover:bg-orange-dark text-white font-semibold h-11"
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="text-sm text-ink-2 text-center mt-6">
        Remember your password?{" "}
        <Link href="/login" className="text-orange font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
