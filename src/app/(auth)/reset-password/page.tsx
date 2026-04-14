"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }

    setLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Failed to reset password. The link may have expired.");
      return;
    }

    router.push("/login?reset=1");
  }

  if (!token) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#262626] mb-1">Invalid link</h1>
          <p className="text-[#6B6B6B] text-sm">This reset link is invalid or has expired.</p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block bg-[#0F2F61] hover:bg-[#0a2347] text-white font-semibold h-11 px-6 rounded-md text-sm flex items-center justify-center"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#262626] mb-1">Set new password</h1>
        <p className="text-[#6B6B6B] text-sm">Choose a strong password with at least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[#262626] font-medium text-sm">
            New password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="border-[#EDEDE9] focus:border-[#0F2F61] focus:ring-[#0F2F61] h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-[#262626] font-medium text-sm">
            Confirm password
          </Label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="border-[#EDEDE9] focus:border-[#0F2F61] focus:ring-[#0F2F61] h-11"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0F2F61] hover:bg-[#0a2347] text-white font-semibold h-11"
        >
          {loading ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
