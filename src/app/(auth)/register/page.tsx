"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signUp.email({ name, email, password });

    if (error) {
      setError(error.message ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect");
    router.push(redirect ?? "/dashboard");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#262626] mb-1">Create an account</h1>
        <p className="text-[#6B6B6B] text-sm">Start creating digital guides for your guests</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[#262626] font-medium text-sm">
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border-[#EDEDE9] focus:border-[#0F2F61] h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[#262626] font-medium text-sm">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-[#EDEDE9] focus:border-[#0F2F61] h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[#262626] font-medium text-sm">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="border-[#EDEDE9] focus:border-[#0F2F61] h-11"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FF6700] hover:bg-[#e05c00] text-white font-semibold h-11"
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-[#6B6B6B] text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[#FF6700] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
