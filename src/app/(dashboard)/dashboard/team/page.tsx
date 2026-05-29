"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, Home, ChevronDown, ChevronUp, Send, Plus, X, AtSign } from "lucide-react";

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
    <div className={`w-${size} h-${size} rounded-full bg-[#0F2F61] flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
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

function TaskCard({ task, members, onUpdate }: { task: Task; members: Member[]; onUpdate: (t: Task) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [commentMentionIds, setCommentMentionIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const mentionedNames = task.mentionIds
    .map(id => members.find(m => m.id === id)?.name)
    .filter(Boolean);

  const mentionMatches = mentionQuery !== null
    ? members.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  function handleCommentChange(value: string) {
    setComment(value);
    const match = value.match(/@([^@ \n]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(member: Member) {
    const replaced = comment.replace(/@([^@ \n]*)$/, `@${member.name.split(" ")[0]} `);
    setComment(replaced);
    setCommentMentionIds(ids => ids.includes(member.id) ? ids : [...ids, member.id]);
    setMentionQuery(null);
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
      setMentionQuery(null);
    }
    setPosting(false);
  }

  return (
    <div className={`bg-white rounded-2xl border transition-all ${task.status === "DONE" ? "border-green-200 opacity-75" : "border-[#EDEDE9]"}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar user={task.author} size={9} />
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-[#262626]">{task.author.name}</span>
              <span className="text-xs text-[#BABAB5]">·</span>
              <span className="text-xs text-[#6B6B6B]">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
              <StatusBadge status={task.status} />
            </div>

            {/* Content */}
            <p className="text-sm text-[#262626] leading-relaxed">{task.content}</p>

            {/* Tags */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.property && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-[#F7F7F5] text-[#0F2F61] border border-[#EDEDE9] font-medium">
                  <Home className="w-3 h-3" /> {task.property.name}
                </span>
              )}
              {mentionedNames.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-[#FFF4EE] text-[#FF6700] border border-[#FFE4D0] font-medium">
                  <AtSign className="w-3 h-3" /> {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F7F7F5]">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#262626] transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {task.comments.length === 0 ? "Add comment" : `${task.comments.length} comment${task.comments.length !== 1 ? "s" : ""}`}
          </button>
          <div className="flex-1" />
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
        <div className="border-t border-[#F7F7F5] px-4 pb-4">
          {task.comments.map(c => (
            <div key={c.id} className="flex gap-2.5 mt-3">
              <Avatar user={c.author} size={7} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-[#262626]">{c.author.name}</span>
                  <span className="text-xs text-[#BABAB5]">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-[#262626]">{c.content}</p>
              </div>
            </div>
          ))}

          <div className="mt-3">
            {mentionMatches.length > 0 && (
              <div className="mb-2 border border-[#EDEDE9] rounded-xl overflow-hidden bg-white shadow-sm">
                {mentionMatches.map(m => (
                  <button
                    key={m.id}
                    onMouseDown={e => { e.preventDefault(); selectMention(m); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#F7F7F5] flex items-center gap-2 transition-colors border-b border-[#F7F7F5] last:border-0"
                  >
                    <AtSign className="w-3.5 h-3.5 text-[#FF6700] shrink-0" />
                    <span className="text-[#262626]">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={e => handleCommentChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                placeholder="Dodaj komentar... (@ za označi)"
                className="flex-1 text-base border border-[#EDEDE9] rounded-xl px-3 py-2 outline-none focus:border-[#0F2F61] bg-[#F7F7F5]"
              />
              <button
                onClick={addComment}
                disabled={posting || !comment.trim()}
                className="p-2 rounded-xl bg-[#0F2F61] text-white disabled:opacity-40 hover:bg-[#1a3d75] transition-colors"
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
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mentionMatches = mentionQuery !== null
    ? members.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  function handleContentChange(value: string) {
    setContent(value);
    const match = value.match(/@([^@ \n]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(member: Member) {
    const replaced = content.replace(/@([^@ \n]*)$/, `@${member.name.split(" ")[0]} `);
    setContent(replaced);
    setMentionIds(ids => ids.includes(member.id) ? ids : [...ids, member.id]);
    setMentionQuery(null);
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
    <div className="bg-white rounded-2xl border border-[#0F2F61] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#262626]">Nova poruka</h3>
        <button onClick={onClose} className="text-[#6B6B6B] hover:text-[#262626]"><X className="w-4 h-4" /></button>
      </div>

      {mentionMatches.length > 0 && (
        <div className="mb-2 border border-[#EDEDE9] rounded-xl overflow-hidden bg-white shadow-sm">
          {mentionMatches.map(m => (
            <button
              key={m.id}
              onMouseDown={e => { e.preventDefault(); selectMention(m); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#F7F7F5] flex items-center gap-2 transition-colors border-b border-[#F7F7F5] last:border-0"
            >
              <AtSign className="w-3.5 h-3.5 text-[#FF6700] shrink-0" />
              <span className="text-[#262626]">{m.name}</span>
            </button>
          ))}
        </div>
      )}
      <textarea
        value={content}
        onChange={e => handleContentChange(e.target.value)}
        placeholder="Opiši problem, zadatak ili obavijest... (@ za označi)"
        rows={3}
        className="w-full text-base border border-[#EDEDE9] rounded-xl px-3 py-2.5 outline-none focus:border-[#0F2F61] resize-none bg-[#F7F7F5]"
        autoFocus
      />

      <select
        value={propertyId}
        onChange={e => setPropertyId(e.target.value)}
        className="w-full mt-3 text-sm border border-[#EDEDE9] rounded-xl px-3 py-2 outline-none focus:border-[#0F2F61] bg-[#F7F7F5] text-[#262626]"
      >
        <option value="">Nekretnina (opcionalno)</option>
        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <div className="flex justify-end mt-4">
        <button
          onClick={submit}
          disabled={submitting || !content.trim()}
          className="px-5 py-2 bg-[#0F2F61] text-white text-sm font-medium rounded-xl hover:bg-[#1a3d75] disabled:opacity-40 transition-colors"
        >
          {submitting ? "Šaljem..." : "Objavi"}
        </button>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "IN_PROGRESS" | "DONE">("ALL");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterMember, setFilterMember] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then(r => r.json()),
      fetch("/api/workspace").then(r => r.json()),
      fetch("/api/properties").then(r => r.json()),
    ]).then(([t, ws, props]) => {
      setTasks(t);
      const allMembers: Member[] = [
        ...(ws?.owner ? [ws.owner] : []),
        ...(ws?.members?.map((m: { user: Member }) => m.user) ?? []),
      ];
      setMembers(allMembers.filter((m, i, a) => a.findIndex(x => x.id === m.id) === i));
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#262626]">Team Channel</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">Interna komunikacija tima</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F2F61] text-white text-sm font-medium rounded-xl hover:bg-[#1a3d75] transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova poruka
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
      <div className="flex gap-1 mb-3 bg-[#F7F7F5] rounded-xl p-1">
        {(["ALL", "IN_PROGRESS", "DONE"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
              filter === f ? "bg-white text-[#0F2F61] shadow-sm" : "text-[#6B6B6B]"
            }`}
          >
            {f === "ALL" ? "Sve" : f === "IN_PROGRESS" ? "U toku" : "Završeno"}
          </button>
        ))}
      </div>

      {/* Filter dropdowns — property + member */}
      <div className="flex gap-2 mb-5">
        <select
          value={filterProperty}
          onChange={e => setFilterProperty(e.target.value)}
          className={`w-1/2 min-w-0 text-xs border rounded-xl px-3 py-2 outline-none bg-white transition-colors ${filterProperty ? "border-[#0F2F61] text-[#0F2F61] font-medium" : "border-[#EDEDE9] text-[#6B6B6B]"}`}
        >
          <option value="">🏠 Nekretnine</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterMember}
          onChange={e => setFilterMember(e.target.value)}
          className={`w-1/2 min-w-0 text-xs border rounded-xl px-3 py-2 outline-none bg-white transition-colors ${filterMember ? "border-[#0F2F61] text-[#0F2F61] font-medium" : "border-[#EDEDE9] text-[#6B6B6B]"}`}
        >
          <option value="">👤 Članovi</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Tasks feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#F7F7F5] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#6B6B6B]">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium text-[#262626]">Nema poruka</p>
          <p className="text-sm mt-1">Klikni "Nova poruka" da kreiraš prvu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              onUpdate={updated => setTasks(all => all.map(t => t.id === updated.id ? updated : t))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
