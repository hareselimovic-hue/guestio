"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setWorkspaceName(d.workspaceName);
        setLoading(false);
      })
      .catch(() => { setError("Could not load invite."); setLoading(false); });
  }, [token]);

  async function handleJoin() {
    setJoining(true);
    const res = await fetch(`/api/invite/${token}/accept`, { method: "POST" });
    if (res.status === 401) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }
    const d = await res.json();
    if (res.ok || d.alreadyMember) {
      setJoined(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setError(d.error ?? "Could not join workspace.");
    }
    setJoining(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0F2F61] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] p-8 max-w-sm w-full text-center">
        {error ? (
          <>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-bold text-[#262626] mb-2">Invalid invite</h1>
            <p className="text-sm text-[#6B6B6B]">{error}</p>
          </>
        ) : joined ? (
          <>
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-lg font-bold text-[#262626] mb-2">Joined!</h1>
            <p className="text-sm text-[#6B6B6B]">Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-[#0F2F61]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-[#0F2F61]" />
            </div>
            <p className="text-sm text-[#6B6B6B] mb-1">You&apos;re invited to join</p>
            <h1
              className="text-xl font-bold text-[#262626] mb-6"
              style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
            >
              {workspaceName}
            </h1>
            <div className="space-y-3">
              <Button
                onClick={handleJoin}
                disabled={joining}
                className="w-full bg-[#0F2F61] hover:bg-[#0a2347] text-white h-11"
              >
                {joining ? "Joining..." : "Join workspace"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/login?redirect=/invite/${token}`)}
                className="w-full h-11 text-sm"
              >
                Sign in with a different account
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
