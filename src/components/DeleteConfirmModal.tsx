"use client";

import { useState } from "react";
import { FileRecord } from "@/types";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { useToast } from "./Toast";

interface DeleteConfirmModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteConfirmModal({ file, isOpen, onClose, onSuccess }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const { success, error: toastError } = useToast();

  if (!isOpen || !file) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/files/${file.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete document");
      }

      success("Document removed from Drive and database");
      onSuccess();
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-4">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <span className="size-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-foreground">Confirm Deletion</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p>
              This action will permanently delete the file from <strong>Drive Slot {file.drive_slot}</strong> and remove its record from the database.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">File to be deleted:</p>
            <p className="text-sm font-bold text-foreground line-clamp-2">{file.title}</p>
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
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="size-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Permanently</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
