"use client";

import { useState, useEffect } from "react";
import { FileRecord } from "@/types";
import { DEFAULT_CATEGORIES } from "@/lib/config";
import { Edit3, X } from "lucide-react";
import { useToast } from "./Toast";

interface RenameModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RenameModal({ file, isOpen, onClose, onSuccess }: RenameModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (file) {
      setTitle(file.title);
      setCategory(file.category || "General");
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update document");
      }

      success("Document details updated successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to update file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-foreground">Rename Document</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="rename-title"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Document Title
            </label>
            <input
              id="rename-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full h-11 px-4 rounded-xl border border-border/80 bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="rename-category"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Category
            </label>
            <select
              id="rename-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border/80 bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              {DEFAULT_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-all shadow-sm shadow-indigo-500/25 disabled:opacity-50"
            >
              {loading ? "Saving changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
