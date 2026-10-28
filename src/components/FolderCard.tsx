"use client";

import Link from "next/link";
import { FolderRecord } from "@/types";
import { Folder, FolderLock, Lock, MoreVertical, Globe, ShieldAlert, ArrowRight } from "lucide-react";
import { useState } from "react";

interface FolderCardProps {
  folder: FolderRecord;
  isAdmin?: boolean;
  onTogglePrivacy?: (folder: FolderRecord) => void;
  onDelete?: (folder: FolderRecord) => void;
  selected?: boolean;
  onSelectToggle?: (folder: FolderRecord) => void;
}

// Colorful theme variants matching the document cards below
const FOLDER_COLOR_THEMES = [
  {
    card: "bg-[#f5f3ff]/70 dark:bg-[#181734]/90 border-[#ddd6fe] dark:border-[#2d285a] hover:border-indigo-400 dark:hover:border-indigo-500/60",
    iconBox: "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#a59bf7] border border-[#ddd6fe] dark:border-[#37306b]",
    blob: "text-indigo-400/20 dark:text-indigo-500/15",
    link: "text-[#4338ca] dark:text-[#a59bf7]",
    badge: "bg-[#ede9fe] text-[#4338ca] dark:bg-[#252147] dark:text-[#c4bbfd] border border-[#ddd6fe] dark:border-[#37306b]",
    openBtn: "bg-[#4338ca] hover:bg-[#3730a3] dark:bg-[#5d4fe6] dark:hover:bg-[#4f41d9] text-white",
  },
  {
    card: "bg-[#fff1f2]/70 dark:bg-[#28131d]/90 border-[#fecdd3] dark:border-[#4d1f31] hover:border-rose-400 dark:hover:border-rose-500/60",
    iconBox: "bg-[#ffe4e6] dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
    blob: "text-rose-400/20 dark:text-rose-500/15",
    link: "text-rose-600 dark:text-rose-400",
    badge: "bg-[#ffe4e6] text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
    openBtn: "bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white",
  },
  {
    card: "bg-[#ecfdf5]/70 dark:bg-[#0e271f]/90 border-[#a7f3d0] dark:border-[#17493a] hover:border-emerald-400 dark:hover:border-emerald-500/60",
    iconBox: "bg-[#d1fae5] dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
    blob: "text-emerald-400/20 dark:text-emerald-500/15",
    link: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-[#d1fae5] text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
    openBtn: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white",
  },
  {
    card: "bg-[#fffbeb]/70 dark:bg-[#281e0d]/90 border-[#fde68a] dark:border-[#4c3713] hover:border-amber-400 dark:hover:border-amber-500/60",
    iconBox: "bg-[#fef3c7] dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
    blob: "text-amber-400/20 dark:text-amber-500/15",
    link: "text-amber-700 dark:text-amber-400",
    badge: "bg-[#fef3c7] text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
    openBtn: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white",
  },
  {
    card: "bg-[#f0f9ff]/70 dark:bg-[#0e2030]/90 border-[#bae6fd] dark:border-[#19405b] hover:border-sky-400 dark:hover:border-sky-500/60",
    iconBox: "bg-[#e0f2fe] dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800",
    blob: "text-sky-400/20 dark:text-sky-500/15",
    link: "text-sky-600 dark:text-sky-400",
    badge: "bg-[#e0f2fe] text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800",
    openBtn: "bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 text-white",
  },
];

export function FolderCard({
  folder,
  isAdmin = false,
  onTogglePrivacy,
  onDelete,
  selected = false,
  onSelectToggle,
}: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isPrivate = folder.is_private || folder.is_effectively_private;

  const totalItems = folder.item_count ?? ((folder.file_count || 0) + (folder.subfolder_count || 0));

  // Deterministically select theme based on folder ID / name
  const hash = Math.abs(
    (folder.id || folder.name || "0")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  );
  const theme = FOLDER_COLOR_THEMES[hash % FOLDER_COLOR_THEMES.length];

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-3xl border p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden w-full ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : isPrivate && isAdmin
          ? "border-amber-500/40 dark:border-amber-500/30 bg-amber-500/[0.04] hover:shadow-amber-500/10"
          : theme.card
      }`}
    >
      {/* Decorative organic watermark blob in bottom-right corner (same as FileCard) */}
      <svg
        viewBox="0 0 200 200"
        className={`absolute -bottom-8 -right-8 w-32 h-32 pointer-events-none transition-transform duration-500 group-hover:scale-115 fill-current ${theme.blob}`}
      >
        <path
          d="M42.7,-62.9C53.8,-53.8,60.2,-40.1,66.1,-26.2C72,-12.3,77.4,1.8,74.5,14.6C71.6,27.4,60.4,38.9,48.2,48.9C36,58.9,22.8,67.4,8.1,70.1C-6.6,72.8,-22.8,69.7,-37.2,62.1C-51.6,54.5,-64.2,42.4,-70.8,27.7C-77.4,13,-78,-4.3,-72.6,-19.1C-67.2,-33.9,-55.8,-46.2,-43,-55C-30.2,-63.8,-15.1,-69.1,0.6,-70C16.3,-70.9,31.6,-72,42.7,-62.9Z"
          transform="translate(100 100)"
        />
      </svg>

      <div className="relative z-10">
        {/* Top Header with Icon & Badges */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            {/* Checkbox for bulk select in admin */}
            {isAdmin && onSelectToggle && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onSelectToggle(folder)}
                aria-label={`Select folder ${folder.name}`}
                className="size-4 rounded border-border text-primary focus:ring-primary/20 transition-all cursor-pointer"
              />
            )}

            {/* Folder Icon Tile styled with vibrant color box */}
            <div
              className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-2xs ${
                isPrivate && isAdmin
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : theme.iconBox
              }`}
            >
              {isPrivate && isAdmin ? (
                <FolderLock className="w-5 h-5" />
              ) : (
                <Folder className="w-5 h-5" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Folder items pill badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${theme.badge}`}
            >
              {totalItems} {totalItems === 1 ? "doc" : "docs"}
            </span>

            {/* Admin-only Private Badge */}
            {isAdmin && isPrivate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Lock className="w-3 h-3" />
                Private
              </span>
            )}

            {/* Admin context menu */}
            {isAdmin && (onTogglePrivacy || onDelete) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Folder options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl border border-border bg-card text-foreground p-1.5 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95">
                      {onTogglePrivacy && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuOpen(false);
                            onTogglePrivacy(folder);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium hover:bg-muted transition-colors"
                        >
                          {isPrivate ? (
                            <>
                              <Globe className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Make Public</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Make Private</span>
                            </>
                          )}
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuOpen(false);
                            onDelete(folder);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Delete Folder</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Folder Title with Link - Bold & Clean like ourdiu Browse */}
        <Link href={`/folder/${folder.id}`} className="block group/link mt-1">
          <h3 className="text-lg sm:text-xl font-black text-foreground line-clamp-1 group-hover/link:text-primary transition-colors tracking-tight">
            {folder.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {totalItems === 0
              ? "Empty directory"
              : `Contains ${totalItems} stored ${totalItems === 1 ? "document" : "documents"}`}
          </p>
        </Link>
      </div>

      {/* Footer Info & Action */}
      <div className="relative z-10 mt-5 pt-3.5 border-t border-border/40 flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-semibold">
          {folder.subfolder_count ? `${folder.subfolder_count} subfolders` : "Main Folder"}
        </span>
        <Link
          href={`/folder/${folder.id}`}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-95 ${theme.openBtn}`}
        >
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

