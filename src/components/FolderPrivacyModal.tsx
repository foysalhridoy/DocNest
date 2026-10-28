"use client";

import { useState } from "react";
import { FolderRecord } from "@/types";
import { Lock, Globe, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

interface FolderPrivacyModalProps {
  folder: FolderRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FolderPrivacyModal({
  folder,
  isOpen,
  onClose,
  onSuccess,
}: FolderPrivacyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !folder) return null;

  const currentIsPrivate = folder.is_private || folder.is_effectively_private;
  const targetIsPrivate = !currentIsPrivate;
  const fileCount = folder.file_count ?? 0;
  const subfolderCount = folder.subfolder_count ?? 0;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "folder",
          targetId: folder.id,
          isPrivate: targetIsPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update folder privacy");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
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
        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
              targetIsPrivate
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {targetIsPrivate ? <Lock className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {targetIsPrivate ? "Make Folder Private?" : "Make Folder Public?"}
            </h3>
            <p className="text-xs text-muted-foreground">{folder.name}</p>
          </div>
        </div>

        {/* Subtree Warning Box */}
        <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-2 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground">
                This change applies to the entire subtree:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  All <strong>{fileCount}</strong> file{fileCount === 1 ? "" : "s"} within this folder
                </li>
                <li>
                  All <strong>{subfolderCount}</strong> nested subfolder{subfolderCount === 1 ? "" : "s"}
                </li>
              </ul>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            {targetIsPrivate
              ? "All files will have their public Google Drive link permissions removed. Only verified administrators will be able to view, preview, or download them."
              : "All files will be granted public read access in Google Drive, making them accessible to any public visitor."}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Buttons */}
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
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50 ${
              targetIsPrivate
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            }`}
          >
            {loading ? (
              <>
                <div className="size-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span>Updating Drive permissions...</span>
              </>
            ) : targetIsPrivate ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm Make Private</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                <span>Confirm Make Public</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

