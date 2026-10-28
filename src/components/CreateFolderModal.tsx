"use client";

import { useState } from "react";
import { FolderRecord } from "@/types";
import { FolderPlus, Lock, Folder } from "lucide-react";

interface CreateFolderModalProps {
  isOpen: boolean;
  folders: FolderRecord[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateFolderModal({
  isOpen,
  folders,
  onClose,
  onSuccess,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("root");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parentFolder = folders.find((f) => f.id === parentId);
  const parentIsPrivate = Boolean(parentFolder?.is_private || parentFolder?.is_effectively_private);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          parentId: parentId === "root" ? null : parentId,
          isPrivate: isPrivate || parentIsPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create folder");
      }

      setName("");
      setParentId("root");
      setIsPrivate(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Create New Folder</h3>
            <p className="text-xs text-muted-foreground">Organize documents, spreadsheets, and files.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Blueprints, Financial Reports, Contracts"
              required
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border border-border/80 bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Parent Folder
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-3 rounded-xl border border-border/80 bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="root">Root (Top Level)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.is_private || f.is_effectively_private ? "🔒 (Private)" : ""}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={isPrivate || parentIsPrivate}
              disabled={loading || parentIsPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="size-4 rounded text-primary focus:ring-primary/20 border-border cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                Mark Folder as Private
              </span>
              <p className="text-[11px] text-muted-foreground">
                {parentIsPrivate
                  ? "Automatically private (inherited from parent folder)"
                  : "Folder and all its contents will only be accessible to logged-in admins"}
              </p>
            </div>
          </label>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-all shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

