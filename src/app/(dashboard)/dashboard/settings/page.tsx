"use client";

import { useEffect, useState } from "react";
import { Settings, Users, Link2, Copy, Check, Trash2, Plus, Plug, Loader2, CheckCircle2, RefreshCw, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface WorkspaceData {
  workspace: { id: string; name: string; ownerId: string; registrationEmails?: string[] };
  isOwner: boolean;
}

interface RentlioStatus {
  connected: boolean;
  connectedAt?: string;
  maskedKey?: string;
}

interface PreviewItem {
  rentlioId: number;
  rentlioName: string;
  status: "linked" | "matchable" | "new";
  localName?: string;
}

interface PreviewData {
  total: number;
  linked: number;
  matchable: number;
  new: number;
  items: PreviewItem[];
}

export default function SettingsPage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Rentlio integration
  const [rentlio, setRentlio] = useState<RentlioStatus>({ connected: false });
  const [rentlioKey, setRentlioKey] = useState("");
  const [connectingRentlio, setConnectingRentlio] = useState(false);
  const [rentlioError, setRentlioError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showList, setShowList] = useState(false);

  // Create workspace
  const [wsName, setWsName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Guest registration emails
  const [regEmails, setRegEmails] = useState("");
  const [savingRegEmails, setSavingRegEmails] = useState(false);
  const [regEmailsMsg, setRegEmailsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [regProperties, setRegProperties] = useState<{ id: string; name: string; guestRegistrationEnabled: boolean }[]>([]);

  // Invite
  const [inviteLink, setInviteLink] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/workspace").then((r) => r.json()),
      fetch("/api/workspace/invite").then((r) => r.json()),
      fetch("/api/workspace/rentlio").then((r) => r.json()),
    ]).then(([d, inv, rl]) => {
      setData(d);
      if (d) {
        setNewName(d.workspace.name);
        setMembers(d.workspace.members?.map((m: { user: Member }) => m.user) ?? []);
        setRegEmails((d.workspace.registrationEmails ?? []).join(", "));
        fetch("/api/registrations/properties").then((r) => r.json()).then(setRegProperties);
      }
      if (inv?.token) {
        setInviteLink(`${window.location.origin}/invite/${inv.token}`);
      }
      if (rl) setRentlio(rl);
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

  async function saveRegEmails() {
    setSavingRegEmails(true);
    setRegEmailsMsg(null);
    const res = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationEmails: regEmails }),
    });
    const d = await res.json();
    if (res.ok) {
      setRegEmails(d.registrationEmails.join(", "));
      setRegEmailsMsg({ ok: true, text: "Saved." });
    } else {
      setRegEmailsMsg({ ok: false, text: d.error ?? "Error" });
    }
    setSavingRegEmails(false);
  }

  async function setRegistrationFor(ids: string[], enabled: boolean) {
    const prev = regProperties;
    setRegProperties((list) => list.map((p) => (ids.includes(p.id) ? { ...p, guestRegistrationEnabled: enabled } : p)));
    const res = await fetch("/api/registrations/properties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, enabled }),
    });
    if (!res.ok) setRegProperties(prev);
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

  async function connectRentlio() {
    setConnectingRentlio(true);
    setRentlioError("");
    const res = await fetch("/api/workspace/rentlio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: rentlioKey }),
    });
    const d = await res.json();
    if (!res.ok) { setRentlioError(d.error ?? "Error"); setConnectingRentlio(false); return; }
    setRentlio(d);
    setRentlioKey("");
    setConnectingRentlio(false);
  }

  async function disconnectRentlio() {
    await fetch("/api/workspace/rentlio", { method: "DELETE" });
    setRentlio({ connected: false });
    setSyncResult("");
  }

  async function checkRentlio() {
    setLoadingPreview(true);
    setPreview(null);
    setSyncResult("");
    const res = await fetch("/api/rentlio/preview");
    const d = await res.json();
    if (!res.ok) { setSyncResult("Error: " + (d.error ?? "Unknown")); setLoadingPreview(false); return; }
    setPreview(d);
    setLoadingPreview(false);
  }

  async function syncRentlio() {
    setSyncing(true);
    setSyncResult("");
    setPreview(null);
    const res = await fetch("/api/rentlio/sync", { method: "POST" });
    const d = await res.json();
    if (!res.ok) { setSyncResult("Error: " + (d.error ?? "Unknown")); setSyncing(false); return; }
    setSyncResult(
      `Done — ${d.matched} matched by name, ${d.created} newly created, ${d.alreadyLinked} already linked.`
    );
    setSyncing(false);
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-navy" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
            Workspace Settings
          </h1>
          <p className="text-sm text-ink-2">Manage your team and access</p>
        </div>
      </div>


      {!data ? (
        /* ── Create workspace ── */
        <div className="bg-white border border-line rounded-xl p-6">
          <h2 className="font-semibold text-ink mb-1">Create a workspace</h2>
          <p className="text-sm text-ink-2 mb-5">
            Give your team a shared space to manage all properties together.
          </p>
          <form onSubmit={createWorkspace} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-ink-2 mb-1.5 block">Workspace name</Label>
              <Input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="e.g. Your Company"
                className="h-10 text-sm border-line"
                required
              />
            </div>
            {createError && <p className="text-sm text-red-500">{createError}</p>}
            <Button
              type="submit"
              disabled={creating || !wsName.trim()}
              className="bg-navy hover:bg-navy-dark text-white h-10 text-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {creating ? "Creating..." : "Create workspace"}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Workspace name ── */}
          <div className="bg-white border border-line rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-ink">Workspace</h2>
              {data.isOwner && !editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-ink-2 hover:text-navy transition-colors"
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
                  className="h-9 text-sm border-line flex-1"
                  autoFocus
                />
                <Button
                  onClick={saveName}
                  disabled={savingName || !newName.trim()}
                  className="bg-navy hover:bg-navy-dark text-white h-9 text-sm px-4"
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
              <p className="text-lg font-bold text-navy" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
                {data.workspace.name}
              </p>
            )}
          </div>

          {/* ── Members ── */}
          <div className="bg-white border border-line rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-ink-2" />
              <h2 className="font-semibold text-ink">Members</h2>
              <span className="bg-navy text-white text-xs px-1.5 py-0.5 rounded-full">{members.length}</span>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-line-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{member.name}</p>
                    <p className="text-xs text-ink-2">{member.email}</p>
                  </div>
                  {data.isOwner && member.id !== data.workspace.ownerId && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-1.5 text-ink-2 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {member.id === data.workspace.ownerId && (
                    <span className="text-xs text-ink-2 bg-canvas px-2 py-1 rounded-lg">Owner</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Guest registrations ── */}
          {(() => {
            const ownerEmail = members.find((m) => m.id === data.workspace.ownerId)?.email ?? "the workspace owner";
            return (
              <div className="bg-white border border-line rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-4 h-4 text-ink-2" />
                  <h2 className="font-semibold text-ink">Guest registrations</h2>
                </div>
                <p className="text-sm text-ink-2 mb-4">
                  Who gets an email when a guest sends their details. Separate multiple addresses with commas.
                </p>
                {data.isOwner ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-ink-2">Notification email</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={regEmails}
                        onChange={(e) => { setRegEmails(e.target.value); setRegEmailsMsg(null); }}
                        placeholder={ownerEmail}
                        className="h-9 text-sm border-line flex-1"
                      />
                      <Button
                        onClick={saveRegEmails}
                        disabled={savingRegEmails}
                        className="bg-navy hover:bg-navy-dark text-white h-9 text-sm shrink-0"
                      >
                        {savingRegEmails ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                    {regEmailsMsg && (
                      <p className={`text-xs ${regEmailsMsg.ok ? "text-green-600" : "text-red-500"}`}>{regEmailsMsg.text}</p>
                    )}
                    <p className="text-xs text-ink-2">If empty, emails go to {ownerEmail}.</p>
                  </div>
                ) : (
                  <p className="text-sm text-ink">
                    {(data.workspace.registrationEmails?.length ? data.workspace.registrationEmails.join(", ") : ownerEmail)}
                  </p>
                )}

                {/* Per-property switch */}
                <div className="mt-5 pt-4 border-t border-line-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-medium text-ink-2">
                      Show registration form on ({regProperties.filter((p) => p.guestRegistrationEnabled).length}/{regProperties.length})
                    </Label>
                    <div className="flex gap-3 text-xs">
                      <button
                        onClick={() => setRegistrationFor(regProperties.map((p) => p.id), true)}
                        className="text-navy hover:underline"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setRegistrationFor(regProperties.map((p) => p.id), false)}
                        className="text-ink-2 hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto border border-line rounded-lg divide-y divide-line-2">
                    {regProperties.map((p) => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-canvas">
                        <input
                          type="checkbox"
                          checked={p.guestRegistrationEnabled}
                          onChange={(e) => setRegistrationFor([p.id], e.target.checked)}
                          className="w-4 h-4 accent-orange"
                        />
                        <span className="text-sm text-ink">{p.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-ink-2 mt-2">New properties have the form switched off. You can also switch it on the property page.</p>
                </div>
              </div>
            );
          })()}

          {/* ── Rentlio integration ── */}
          <div className="bg-white border border-line rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Plug className="w-4 h-4 text-ink-2" />
              <h2 className="font-semibold text-ink">Integrations</h2>
            </div>
            <p className="text-sm text-ink-2 mb-4">Connect external services to your workspace.</p>

            <div className="border border-line rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#F0F4FF] rounded-lg flex items-center justify-center text-sm font-bold text-navy">R</div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Rentlio</p>
                    <p className="text-xs text-ink-2">Property management system</p>
                  </div>
                </div>
                {rentlio.connected && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </div>
                )}
              </div>

              {rentlio.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-canvas rounded-lg px-3 py-2">
                    <span className="text-xs font-mono text-ink">{rentlio.maskedKey}</span>
                    {rentlio.connectedAt && (
                      <span className="text-xs text-ink-2">
                        {new Date(rentlio.connectedAt).toLocaleDateString("bs-BA")}
                      </span>
                    )}
                  </div>
                  {/* Preview — broj novih */}
                  {preview && !syncResult && (
                    <div className="bg-canvas rounded-lg p-4 space-y-3">
                      {preview.new + preview.matchable === 0 ? (
                        <p className="text-sm font-medium text-ink">All properties are already imported.</p>
                      ) : (
                        <p className="text-sm font-medium text-ink">
                          Found <span className="text-navy">{preview.new + preview.matchable}</span> properties not yet imported.
                        </p>
                      )}
                      {preview.new + preview.matchable > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={syncRentlio}
                            disabled={syncing}
                            className="bg-navy hover:bg-navy-dark text-white h-9 text-sm"
                          >
                            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            {syncing ? "Importing..." : "Import"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowList(true)}
                            className="h-9 text-sm"
                          >
                            Show list
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setPreview(null)}
                            className="h-9 text-sm"
                            disabled={syncing}
                          >
                            Not now
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {syncResult && (
                    <p className="text-xs text-ink-2 bg-canvas rounded-lg px-3 py-2">{syncResult}</p>
                  )}

                  {!preview && !syncResult && (
                    <div className="flex gap-2">
                      <Button
                        onClick={checkRentlio}
                        disabled={loadingPreview}
                        className="bg-navy hover:bg-navy-dark text-white h-9 text-sm flex-1"
                      >
                        {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                        {loadingPreview ? "Checking..." : "Sync properties"}
                      </Button>
                      {data.isOwner && (
                        <Button
                          variant="outline"
                          onClick={disconnectRentlio}
                          className="h-9 text-sm text-red-500 hover:text-red-600 hover:border-red-300"
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                data.isOwner ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-ink-2">Rentlio API key</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={rentlioKey}
                        onChange={(e) => setRentlioKey(e.target.value)}
                        placeholder="Enter your Rentlio API key..."
                        className="h-9 text-sm border-line flex-1 font-mono"
                      />
                      <Button
                        onClick={connectRentlio}
                        disabled={connectingRentlio || !rentlioKey.trim()}
                        className="bg-navy hover:bg-navy-dark text-white h-9 text-sm shrink-0"
                      >
                        {connectingRentlio ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                      </Button>
                    </div>
                    {rentlioError && <p className="text-xs text-red-500">{rentlioError}</p>}
                    <p className="text-xs text-ink-2">
                      Find your API key in Rentlio → Settings → API.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-ink-2">Only the workspace owner can manage integrations.</p>
                )
              )}
            </div>
          </div>

          {/* ── Invite ── */}
          {data.isOwner && (
            <div className="bg-white border border-line rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-ink-2" />
                <h2 className="font-semibold text-ink">Invite link</h2>
              </div>
              <p className="text-sm text-ink-2 mb-3">
                Generate a link and share it with your team. Anyone with the link can join.
              </p>
              {inviteLink ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-canvas rounded-lg px-3 py-2">
                    <span className="text-xs text-ink flex-1 truncate font-mono">{inviteLink}</span>
                    <button
                      onClick={copyLink}
                      className="flex items-center gap-1.5 text-xs font-medium text-navy bg-white border border-line px-3 py-1.5 rounded-lg hover:bg-line-2 transition-colors shrink-0"
                    >
                      {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                  <button
                    onClick={rotateInvite}
                    className="text-xs text-ink-2 hover:text-red-500 transition-colors"
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
          )}
        </div>
      )}

      {/* ── Show list modal ── */}
      {showList && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowList(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="font-semibold text-ink">Properties to import ({preview.new + preview.matchable})</h3>
              <button onClick={() => setShowList(false)} className="text-ink-2 hover:text-ink transition-colors text-lg leading-none">✕</button>
            </div>
            <ul className="divide-y divide-line-2 max-h-80 overflow-y-auto">
              {preview.items.filter(i => i.status !== "linked").map((item) => (
                <li key={item.rentlioId} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-ink">{item.rentlioName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-3 ${item.status === "matchable" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
                    {item.status === "matchable" ? "Name match" : "New"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-5 py-4 border-t border-line flex gap-2">
              <Button
                onClick={() => { setShowList(false); syncRentlio(); }}
                disabled={syncing}
                className="bg-navy hover:bg-navy-dark text-white h-9 text-sm flex-1"
              >
                Import all
              </Button>
              <Button variant="outline" onClick={() => setShowList(false)} className="h-9 text-sm">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
