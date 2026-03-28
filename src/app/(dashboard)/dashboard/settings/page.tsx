"use client";

import { useEffect, useState } from "react";
import { Settings, Users, Link2, Copy, Check, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface WorkspaceData {
  workspace: { id: string; name: string; ownerId: string };
  isOwner: boolean;
}

export default function SettingsPage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Create workspace
  const [wsName, setWsName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Invite
  const [inviteLink, setInviteLink] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/workspace").then((r) => r.json()),
      fetch("/api/workspace/invite").then((r) => r.json()),
    ]).then(([d, inv]) => {
      setData(d);
      if (d) {
        setNewName(d.workspace.name);
        setMembers(d.workspace.members?.map((m: { user: Member }) => m.user) ?? []);
      }
      if (inv?.token) {
        setInviteLink(`${window.location.origin}/invite/${inv.token}`);
      }
      setLoading(false);
    });
  }, []);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wsName }),
    });
    const d = await res.json();
    if (!res.ok) { setCreateError(d.error ?? "Error"); setCreating(false); return; }
    setData(d);
    setNewName(d.workspace.name);
    setMembers(d.workspace.members?.map((m: { user: Member }) => m.user) ?? []);
    setCreating(false);
  }

  async function saveName() {
    setSavingName(true);
    await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setData((prev) => prev ? { ...prev, workspace: { ...prev.workspace, name: newName } } : prev);
    setEditingName(false);
    setSavingName(false);
  }

  async function generateInvite() {
    setGeneratingInvite(true);
    const res = await fetch("/api/workspace/invite", { method: "POST" });
    const d = await res.json();
    if (d.token) setInviteLink(`${window.location.origin}/invite/${d.token}`);
    setGeneratingInvite(false);
  }

  async function rotateInvite() {
    setGeneratingInvite(true);
    const res = await fetch("/api/workspace/invite", { method: "PUT" });
    const d = await res.json();
    if (d.token) setInviteLink(`${window.location.origin}/invite/${d.token}`);
    setGeneratingInvite(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }


  async function removeMember(userId: string) {
    await fetch(`/api/workspace/members/${userId}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.id !== userId));
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0F2F61] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#0F2F61]/10 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-[#0F2F61]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#262626]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
            Workspace Settings
          </h1>
          <p className="text-sm text-[#6B6B6B]">Manage your team and access</p>
        </div>
      </div>

      {!data ? (
        /* ── Create workspace ── */
        <div className="bg-white border border-[#EDEDE9] rounded-xl p-6">
          <h2 className="font-semibold text-[#262626] mb-1">Create a workspace</h2>
          <p className="text-sm text-[#6B6B6B] mb-5">
            Give your team a shared space to manage all properties together.
          </p>
          <form onSubmit={createWorkspace} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Workspace name</Label>
              <Input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="e.g. Sarajevo Rent & Manage"
                className="h-10 text-sm border-[#EDEDE9]"
                required
              />
            </div>
            {createError && <p className="text-sm text-red-500">{createError}</p>}
            <Button
              type="submit"
              disabled={creating || !wsName.trim()}
              className="bg-[#0F2F61] hover:bg-[#0a2347] text-white h-10 text-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {creating ? "Creating..." : "Create workspace"}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Workspace name ── */}
          <div className="bg-white border border-[#EDEDE9] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#262626]">Workspace</h2>
              {data.isOwner && !editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-[#6B6B6B] hover:text-[#0F2F61] transition-colors"
                >
                  Edit name
                </button>
              )}
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 text-sm border-[#EDEDE9] flex-1"
                  autoFocus
                />
                <Button
                  onClick={saveName}
                  disabled={savingName || !newName.trim()}
                  className="bg-[#0F2F61] hover:bg-[#0a2347] text-white h-9 text-sm px-4"
                >
                  {savingName ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setEditingName(false); setNewName(data.workspace.name); }}
                  className="h-9 text-sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="text-lg font-bold text-[#0F2F61]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
                {data.workspace.name}
              </p>
            )}
          </div>

          {/* ── Members ── */}
          <div className="bg-white border border-[#EDEDE9] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[#6B6B6B]" />
              <h2 className="font-semibold text-[#262626]">Members</h2>
              <span className="bg-[#0F2F61] text-white text-xs px-1.5 py-0.5 rounded-full">{members.length}</span>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-[#F0F0EE] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#262626]">{member.name}</p>
                    <p className="text-xs text-[#6B6B6B]">{member.email}</p>
                  </div>
                  {data.isOwner && member.id !== data.workspace.ownerId && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-1.5 text-[#6B6B6B] hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {member.id === data.workspace.ownerId && (
                    <span className="text-xs text-[#6B6B6B] bg-[#F7F7F5] px-2 py-1 rounded-lg">Owner</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Invite ── */}
          {data.isOwner && (
            <div className="bg-white border border-[#EDEDE9] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-[#6B6B6B]" />
                <h2 className="font-semibold text-[#262626]">Invite link</h2>
              </div>
              <p className="text-sm text-[#6B6B6B] mb-3">
                Generate a link and share it with your team. Anyone with the link can join.
              </p>
              {inviteLink ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-[#F7F7F5] rounded-lg px-3 py-2">
                    <span className="text-xs text-[#262626] flex-1 truncate font-mono">{inviteLink}</span>
                    <button
                      onClick={copyLink}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#0F2F61] bg-white border border-[#EDEDE9] px-3 py-1.5 rounded-lg hover:bg-[#F0F0EE] transition-colors shrink-0"
                    >
                      {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                  <button
                    onClick={rotateInvite}
                    className="text-xs text-[#6B6B6B] hover:text-red-500 transition-colors"
                  >
                    Generate new link (invalidates current)
                  </button>
                </div>
              ) : (
                <Button
                  onClick={generateInvite}
                  disabled={generatingInvite}
                  variant="outline"
                  className="h-9 text-sm"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  {generatingInvite ? "Generating..." : "Generate invite link"}
                </Button>
              )}
            </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
