"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, Home, ChevronDown, ChevronUp, Send, Plus, X, AtSign, Trash2 } from "lucide-react";

interface Author { id: string; name: string; email?: string; image?: string | null; }
interface Property { id: string; name: string; }
interface Comment { id: string; content: string; author: Author; createdAt: string; }
interface Task {
  id: string;
  content: string;
  status: "IN_PROGRESS" | "DONE";
  author: Author;
  property: Property | null;
  mentionIds: string[];
  comments: Comment[];
  createdAt: string;
}
interface Member { id: string; name: string; email: string; }

function Avatar({ user, size = 8 }: { user: Author; size?: number }) {
  const initials = user.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div className={`w-${size} h-${size} rounded-full bg-navy flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
      {user.image ? <img src={user.image} className="w-full h-full rounded-full object-cover" alt="" /> : initials}
    </div>
  );
}

function StatusBadge({ status }: { status: Task["status"] }) {
  return status === "DONE" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle2 className="w-3 h-3" /> Done
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <Clock className="w-3 h-3" /> In Progress
    </span>
  );
}

function TaskCard({ task, members, currentUserId, onUpdate, onDelete }: { task: Task; members: Member[]; currentUserId: string | null; onUpdate: (t: Task) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [commentMentionIds, setCommentMentionIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mentionedNames = task.mentionIds
    .map(id => members.find(m => m.id === id)?.name)
    .filter(Boolean);

  function pickMention(member: Member) {
    setCommentMentionIds(ids => ids.includes(member.id) ? ids : [...ids, member.id]);
    setShowPicker(false);
  }

  async function toggleStatus() {
    const next = task.status === "IN_PROGRESS" ? "DONE" : "IN_PROGRESS";
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) onUpdate(await res.json());
  }

  async function deleteTask() {
    if (!confirm("Delete this message?")) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) onDelete(task.id);
    else { setDeleting(false); }
  }

  async function addComment() {
    if (!comment.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment.trim(), mentionIds: commentMentionIds }),
    });
    if (res.ok) {
      const newComment = await res.json();
      onUpdate({ ...task, comments: [...task.comments, newComment] });
      setComment("");
      setCommentMentionIds([]);
    }
    setPosting(false);
  }

  return (
    <div className={`bg-white rounded-2xl border transition-all ${task.status === "DONE" ? "border-green-200 opacity-75" : "border-line"}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar user={task.author} size={9} />
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-ink">{task.author.name}</span>
              <span className="text-xs text-ink-4">·</span>
              <span className="text-xs text-ink-2">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
              <StatusBadge status={task.status} />
            </div>

            {/* Content */}
            <p className="text-sm text-ink leading-relaxed">{task.content}</p>

            {/* Tags */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.property && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-canvas text-navy border border-line font-medium">
                  <Home className="w-3 h-3" /> {task.property.name}
                </span>
              )}
              {mentionedNames.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-orange-tint text-orange border border-orange-soft font-medium">
                  <AtSign className="w-3 h-3" /> {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-canvas">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {task.comments.length === 0 ? "Comment" : `${task.comments.length} comment${task.comments.length !== 1 ? "s" : ""}`}
          </button>
          <div className="flex-1" />
          {currentUserId === task.author.id && (
            <button
              onClick={deleteTask}
              disabled={deleting}
              className="p-1 text-ink-4 hover:text-red-500 transition-colors disabled:opacity-40"
              title="Obriši poruku"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={toggleStatus}
            className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${
              task.status === "IN_PROGRESS"
                ? "border-green-300 text-green-700 hover:bg-green-50"
                : "border-orange-300 text-orange-700 hover:bg-orange-50"
            }`}
          >
            {task.status === "IN_PROGRESS" ? "Mark as Done" : "Reopen"}
          </button>
        </div>
      </div>

      {/* Comments */}
      {expanded && (
        <div className="border-t border-canvas px-4 pb-4">
          {task.comments.map(c => (
            <div key={c.id} className="flex gap-2.5 mt-3">
              <Avatar user={c.author} size={7} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-ink">{c.author.name}</span>
                  <span className="text-xs text-ink-4">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-ink">{c.content}</p>
              </div>
            </div>
          ))}

          <div className="mt-3">
            {commentMentionIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {commentMentionIds.map(id => {
                  const m = members.find(x => x.id === id);
                  if (!m) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => setCommentMentionIds(ids => ids.filter(i => i !== id))}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-orange-tint text-orange border border-orange-soft hover:bg-orange-soft transition-colors"
                    >
                      <AtSign className="w-3 h-3" />{m.name.split(" ")[0]} <X className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            )}
            {showPicker && members.length > 0 && (
              <div className="mb-2 border border-line rounded-xl overflow-hidden bg-white shadow-sm">
                <button
                  onMouseDown={e => { e.preventDefault(); setCommentMentionIds(members.map(m => m.id)); setShowPicker(false); }}
                  className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-orange-tint flex items-center gap-2 transition-colors border-b border-line text-orange"
                >
                  <AtSign className="w-3.5 h-3.5 shrink-0" />
                  Tag All
                </button>
                {members.map(m => (
                  <button
                    key={m.id}
                    onMouseDown={e => { e.preventDefault(); pickMention(m); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-canvas flex items-center gap-2 transition-colors border-b border-canvas last:border-0"
                  >
                    <AtSign className="w-3.5 h-3.5 text-orange shrink-0" />
                    <span className="text-ink">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              {members.length > 0 && (
                <button
                  onClick={() => setShowPicker(p => !p)}
                  className={`p-2 rounded-xl border transition-colors ${showPicker ? "bg-orange border-orange text-white" : "border-line text-ink-2 hover:border-navy"}`}
                  title="Mention a teammate"
                >
                  <AtSign className="w-4 h-4" />
                </button>
              )}
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                placeholder="Add a comment..."
                className="flex-1 text-base border border-line rounded-xl px-3 py-2 outline-none focus:border-navy bg-canvas"
              />
              <button
                onClick={addComment}
                disabled={posting || !comment.trim()}
                className="p-2 rounded-xl bg-navy text-white disabled:opacity-40 hover:bg-navy-mid transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewTaskForm({ members, properties, onCreated, onClose }: {
  members: Member[];
  properties: Property[];
  onCreated: (t: Task) => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function pickMention(member: Member) {
    setMentionIds(ids => ids.includes(member.id) ? ids : [...ids, member.id]);
    setShowPicker(false);
  }

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, propertyId: propertyId || undefined, mentionIds }),
    });
    if (res.ok) {
      onCreated(await res.json());
      onClose();
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-navy p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">New message</h3>
        <button onClick={onClose} className="text-ink-2 hover:text-ink"><X className="w-4 h-4" /></button>
      </div>

      {mentionIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {mentionIds.map(id => {
            const m = members.find(x => x.id === id);
            if (!m) return null;
            return (
              <button
                key={id}
                onClick={() => setMentionIds(ids => ids.filter(i => i !== id))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-orange-tint text-orange border border-orange-soft hover:bg-orange-soft transition-colors"
              >
                <AtSign className="w-3 h-3" />{m.name.split(" ")[0]} <X className="w-3 h-3" />
              </button>
            );
          })}
        </div>
      )}
      {showPicker && members.length > 0 && (
        <div className="mb-2 border border-line rounded-xl overflow-hidden bg-white shadow-sm">
          <button
            onMouseDown={e => { e.preventDefault(); setMentionIds(members.map(m => m.id)); setShowPicker(false); }}
            className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-orange-tint flex items-center gap-2 transition-colors border-b border-line text-orange"
          >
            <AtSign className="w-3.5 h-3.5 shrink-0" />
            Tag All
          </button>
          {members.map(m => (
            <button
              key={m.id}
              onMouseDown={e => { e.preventDefault(); pickMention(m); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-canvas flex items-center gap-2 transition-colors border-b border-canvas last:border-0"
            >
              <AtSign className="w-3.5 h-3.5 text-orange shrink-0" />
              <span className="text-ink">{m.name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Describe the issue, task or announcement..."
          rows={3}
          className="w-full text-base border border-line rounded-xl px-3 py-2.5 pr-10 outline-none focus:border-navy resize-none bg-canvas"
          autoFocus
        />
        {members.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPicker(p => !p)}
            className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${showPicker ? "bg-orange text-white" : "text-ink-2 hover:text-navy"}`}
            title="Mention a teammate"
          >
            <AtSign className="w-4 h-4" />
          </button>
        )}
      </div>

      <select
        value={propertyId}
        onChange={e => setPropertyId(e.target.value)}
        className="w-full mt-3 text-sm border border-line rounded-xl px-3 py-2 outline-none focus:border-navy bg-canvas text-ink"
      >
        <option value="">Property (optional)</option>
        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <div className="flex justify-end mt-4">
        <button
          onClick={submit}
          disabled={submitting || !content.trim()}
          className="px-5 py-2 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-mid disabled:opacity-40 transition-colors"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}

function CreateWorkspaceModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      onCreated();
    } else {
      const d = await res.json();
      setError(d.error ?? "Could not create workspace.");
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="bg-white rounded-2xl border border-line shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Create a workspace</h2>
          <button onClick={onClose} className="text-ink-2 hover:text-ink"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-ink-2 mb-4 leading-relaxed">
          To use Team Channel, you need a workspace. Give it a name to get started.
        </p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
          placeholder="e.g. My Property Team"
          autoFocus
          className="w-full text-sm border border-line rounded-xl px-3 py-2.5 outline-none focus:border-navy bg-canvas mb-3"
        />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium px-4 py-2 border border-line rounded-xl text-ink-2 hover:bg-canvas transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="flex-1 text-sm font-medium px-4 py-2 bg-navy text-white rounded-xl hover:bg-navy-mid disabled:opacity-40 transition-colors"
          >
            {creating ? "Creating..." : "Create workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "IN_PROGRESS" | "DONE">("IN_PROGRESS");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterMember, setFilterMember] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then(r => r.json()),
      fetch("/api/workspace").then(r => r.json()),
      fetch("/api/properties").then(r => r.json()),
      fetch("/api/auth/get-session").then(r => r.json()),
    ]).then(([t, ws, props, session]) => {
      setTasks(t);
      setCurrentUserId(session?.user?.id ?? null);
      setHasWorkspace(!!ws?.workspace);
      const allMembers: Member[] = (ws?.workspace?.members ?? [])
        .map((m: { user: Member }) => m.user)
        .filter((m: Member, i: number, a: Member[]) => a.findIndex(x => x.id === m.id) === i);
      setMembers(allMembers);
      setProperties(props.map((p: Property & Record<string, unknown>) => ({ id: p.id, name: p.name })));
      setLoading(false);
    });
  }, []);

  const filtered = tasks.filter(t => {
    if (filter !== "ALL" && t.status !== filter) return false;
    if (filterProperty && t.property?.id !== filterProperty) return false;
    if (filterMember && t.author.id !== filterMember && !t.mentionIds.includes(filterMember)) return false;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {showWorkspaceModal && (
        <CreateWorkspaceModal
          onCreated={() => { setHasWorkspace(true); setShowWorkspaceModal(false); setShowForm(true); }}
          onClose={() => setShowWorkspaceModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Team Channel</h1>
          <p className="text-sm text-ink-2 mt-0.5">Internal team communication</p>
        </div>
        <button
          onClick={() => hasWorkspace ? setShowForm(true) : setShowWorkspaceModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-mid transition-colors"
        >
          <Plus className="w-4 h-4" /> New message
        </button>
      </div>

      {/* New task form */}
      {showForm && (
        <div className="mb-6">
          <NewTaskForm
            members={members}
            properties={properties}
            onCreated={t => setTasks(all => [t, ...all])}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filter tabs — status */}
      <div className="flex gap-1 mb-3 bg-canvas rounded-xl p-1">
        {(["IN_PROGRESS", "DONE", "ALL"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
              filter === f ? "bg-white text-navy shadow-sm" : "text-ink-2"
            }`}
          >
            {f === "ALL" ? "All" : f === "IN_PROGRESS" ? "In Progress" : "Done"}
          </button>
        ))}
      </div>

      {/* Filter dropdowns — property + member */}
      <div className="flex gap-2 mb-5">
        <select
          value={filterProperty}
          onChange={e => setFilterProperty(e.target.value)}
          className={`w-1/2 min-w-0 text-xs border rounded-xl px-3 py-2 outline-none bg-white transition-colors ${filterProperty ? "border-navy text-navy font-medium" : "border-line text-ink-2"}`}
        >
          <option value="">🏠 Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterMember}
          onChange={e => setFilterMember(e.target.value)}
          className={`w-1/2 min-w-0 text-xs border rounded-xl px-3 py-2 outline-none bg-white transition-colors ${filterMember ? "border-navy text-navy font-medium" : "border-line text-ink-2"}`}
        >
          <option value="">👤 Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Tasks feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-canvas rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-2">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium text-ink">No messages</p>
          <p className="text-sm mt-1">Click "New message" to create the first one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              currentUserId={currentUserId}
              onUpdate={updated => setTasks(all => all.map(t => t.id === updated.id ? updated : t))}
              onDelete={id => setTasks(all => all.filter(t => t.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
