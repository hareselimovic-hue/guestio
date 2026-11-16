"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { HOTELS_PUBLIC } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  // Prefilled when coming from the smartstay.ba landing page ("Kreiraj nalog" after leaving the email)
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"APARTMENT" | "HOTEL">(searchParams.get("type") === "hotel" ? "HOTEL" : "APARTMENT");
  const [hotelName, setHotelName] = useState("");
  // Invited team members join an existing workspace — no apartment/hotel choice for them
  const isInvite = searchParams.get("redirect")?.startsWith("/invite/") ?? false;
  // Apartment/Hotel choice only once hotel mode is public; until then the hotels page
  // links here with ?type=hotel (the server only grants hotel mode to hotel-page leads)
  const showTypeChoice = HOTELS_PUBLIC && !isInvite;
  const isHotel = showTypeChoice ? accountType === "HOTEL" : !isInvite && searchParams.get("type") === "hotel";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Only same-site paths — never an external URL from the query string
    const redirectParam = searchParams.get("redirect");
    const redirect = redirectParam?.startsWith("/") && !redirectParam.startsWith("//") ? redirectParam : null;

    // callbackURL lets the server recognise workspace invites (/invite/<token>) — invited team members
    // may register without being on the whitelist
    const { error } = await signUp.email({ name, email, password, ...(redirect ? { callbackURL: redirect } : {}) });

    if (error) {
      setError(error.message ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // Signed in right after signup — hotels: remember the type, create the hotel and open its guide.
    // Best-effort: if anything fails, the dashboard's "Create your hotel" step picks it up.
    if (isHotel) {
      try {
        const acc = await fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountType: "HOTEL" }),
        });
        if (!acc.ok) throw new Error("no hotel access");
        const res = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: hotelName.trim(), kind: "HOTEL" }),
        });
        if (res.ok) {
          const hotel = await res.json();
          router.push(`/dashboard/hotel?property=${hotel.id}&tab=guide`);
          return;
        }
      } catch {}
    }

    router.push(redirect ?? "/dashboard");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink mb-1">{isHotel && !showTypeChoice ? "Create your hotel account" : "Create an account"}</h1>
        <p className="text-ink-2 text-sm">
          {isHotel && !showTypeChoice ? "Hotel guide, room QR codes and reception requests — 30 days free" : "Start creating digital guides for your guests"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {showTypeChoice && <div className="space-y-1.5">
          <Label className="text-ink font-medium text-sm">I manage</Label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["APARTMENT", "Apartments", "Holiday rentals, one guide per place"],
              ["HOTEL", "Hotel", "Rooms, reception requests, room service"],
            ] as const).map(([value, title, sub]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value)}
                className={`text-left rounded-xl border-2 px-3 py-2.5 transition-colors ${
                  accountType === value ? "border-orange bg-orange-50/60" : "border-line hover:border-line-strong"
                }`}
              >
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="text-xs text-ink-2 leading-snug mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
        </div>}

        {isHotel && (
          <div className="space-y-1.5">
            <Label htmlFor="hotelName" className="text-ink font-medium text-sm">
              Hotel name
            </Label>
            <Input
              id="hotelName"
              type="text"
              placeholder="e.g. Grand Hotel"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              required
              className="border-line focus:border-navy h-11"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-ink font-medium text-sm">
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border-line focus:border-navy h-11"
          />
        </div>

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
            className="border-line focus:border-navy h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-ink font-medium text-sm">
            Password
          </Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="border-line focus:border-navy h-11"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
            {error}
            {error.includes("smartstay.ba") && (
              <>
                {" "}
                <a href="https://smartstay.ba/#kontakt" className="font-semibold underline">Idi na smartstay.ba →</a>
              </>
            )}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-orange hover:bg-orange-dark text-white font-semibold h-11"
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-ink-2 text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-orange font-medium hover:underline">
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
