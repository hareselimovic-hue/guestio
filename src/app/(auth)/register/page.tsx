"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
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
      setError(error.message ?? "Greška pri registraciji. Pokušajte ponovo.");
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
        <CardTitle className="text-2xl font-bold text-[#262626]">Kreirajte račun</CardTitle>
        <CardDescription className="text-[#6B6B6B]">
          Počnite kreirati digitalne vodiče za vaše goste
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#262626] font-medium">
              Ime i prezime
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Ime Prezime"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-[#EDEDE9] focus:border-[#0F2F61]"
            />
          </div>

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
              className="border-[#EDEDE9] focus:border-[#0F2F61]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#262626] font-medium">
              Lozinka
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 znakova"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="border-[#EDEDE9] focus:border-[#0F2F61]"
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
            className="w-full bg-[#FF6700] hover:bg-[#e05c00] text-white font-semibold py-2.5"
          >
            {loading ? "Kreiranje računa..." : "Kreiraj račun"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-[#6B6B6B]">
          Već imate račun?{" "}
          <Link href="/login" className="text-[#FF6700] font-medium hover:underline">
            Prijavite se
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
