"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Pogrešan email ili lozinka.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="bg-[#0F2F61] text-white px-4 py-2 rounded-lg font-bold text-xl tracking-tight">
            Guestio
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-[#262626]">Dobrodošli nazad</CardTitle>
        <CardDescription className="text-[#6B6B6B]">
          Prijavite se na vaš račun
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#262626] font-medium">
              Email adresa
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="vas@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-[#EDEDE9] focus:border-[#0F2F61] focus:ring-[#0F2F61]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#262626] font-medium">
              Lozinka
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-[#EDEDE9] focus:border-[#0F2F61] focus:ring-[#0F2F61]"
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
            className="w-full bg-[#0F2F61] hover:bg-[#0a2347] text-white font-semibold py-2.5"
          >
            {loading ? "Prijavljivanje..." : "Prijavi se"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-[#6B6B6B]">
          Nemate račun?{" "}
          <Link href="/register" className="text-[#FF6700] font-medium hover:underline">
            Registrujte se
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
