"use client";

import Link from "next/link";
import { FileRecord } from "@/types";
import { formatBytes, formatDate, getFileMeta } from "@/lib/utils";
import { FileText, Presentation, FileSpreadsheet, File, Download, Eye, Share2, Check, Lock } from "lucide-react";
import { useState } from "react";
import { useToast } from "./Toast";

interface FileCardProps {
  file: FileRecord;
  isAdmin?: boolean;
}

export function FileCard({ file, isAdmin = false }: FileCardProps) {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const meta = getFileMeta(file.title, file.mime_type);
  const isPrivate = file.is_private || file.is_effectively_private;

  const downloadUrl =
    isAdmin && isPrivate
      ? `/api/admin/file/${file.id}/stream?download=true`
      : `/api/files/${file.id}/download`;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/file/${file.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      prompt("Copy document link:", url);
    }
  };

  // Type-specific color themes inspired by ourdiu.com cards
  const typeCardTheme = {
    pdf: {
      card: "bg-[#fff1f2]/70 dark:bg-[#28131d]/90 border-[#fecdd3] dark:border-[#4d1f31] hover:border-rose-400 dark:hover:border-rose-500/60",
      blob: "text-rose-400/20 dark:text-rose-500/15",
      badge: "bg-[#ffe4e6] text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800",
      viewBtn: "bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white shadow-rose-500/25",
    },
    docx: {
      card: "bg-[#f5f3ff]/70 dark:bg-[#181734]/90 border-[#ddd6fe] dark:border-[#2d285a] hover:border-indigo-400 dark:hover:border-indigo-500/60",
      blob: "text-indigo-400/20 dark:text-indigo-500/15",
      badge: "bg-[#ede9fe] text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-800",
      viewBtn: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-indigo-500/25",
    },
    xlsx: {
      card: "bg-[#ecfdf5]/70 dark:bg-[#0e271f]/90 border-[#a7f3d0] dark:border-[#17493a] hover:border-emerald-400 dark:hover:border-emerald-500/60",
      blob: "text-emerald-400/20 dark:text-emerald-500/15",
      badge: "bg-[#d1fae5] text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800",
      viewBtn: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-emerald-500/25",
    },
    pptx: {
      card: "bg-[#fffbeb]/70 dark:bg-[#281e0d]/90 border-[#fde68a] dark:border-[#4c3713] hover:border-amber-400 dark:hover:border-amber-500/60",
      blob: "text-amber-400/20 dark:text-amber-500/15",
      badge: "bg-[#fef3c7] text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800",
      viewBtn: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow-amber-500/25",
    },
    txt: {
      card: "bg-[#f8fafc]/70 dark:bg-[#161524]/90 border-slate-200 dark:border-[#28263a] hover:border-slate-400 dark:hover:border-slate-500/60",
      blob: "text-slate-400/20 dark:text-slate-500/15",
      badge: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 border border-slate-300 dark:border-slate-700",
      viewBtn: "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white shadow-slate-500/25",
    },
    file: {
      card: "bg-card dark:bg-[#161522] border-border/80 dark:border-[#262438] hover:border-primary/50",
      blob: "text-primary/10",
      badge: "bg-muted text-muted-foreground border border-border/70",
      viewBtn: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-indigo-500/25",
    },
  };

  const currentTheme = typeCardTheme[meta.type] || typeCardTheme.file;

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-3xl border p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden w-full ${
        isPrivate && isAdmin
          ? "border-amber-500/40 dark:border-amber-500/30 bg-amber-500/[0.04] hover:shadow-amber-500/10"
          : currentTheme.card
      }`}
    >
      {/* Decorative organic watermark blob in bottom-right corner (inspired by ourdiu.com) */}
      <svg
        viewBox="0 0 200 200"
        className={`absolute -bottom-8 -right-8 w-32 h-32 pointer-events-none transition-transform duration-500 group-hover:scale-115 fill-current ${currentTheme.blob}`}
      >
        <path d="M42.7,-62.9C53.8,-53.8,60.2,-40.1,66.1,-26.2C72,-12.3,77.4,1.8,74.5,14.6C71.6,27.4,60.4,38.9,48.2,48.9C36,58.9,22.8,67.4,8.1,70.1C-6.6,72.8,-22.8,69.7,-37.2,62.1C-51.6,54.5,-64.2,42.4,-70.8,27.7C-77.4,13,-78,-4.3,-72.6,-19.1C-67.2,-33.9,-55.8,-46.2,-43,-55C-30.2,-63.8,-15.1,-69.1,0.6,-70C16.3,-70.9,31.6,-72,42.7,-62.9Z" transform="translate(100 100)" />
      </svg>

      <div className="relative z-10">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Format Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-2xs ${currentTheme.badge}`}
            >
              {meta.type === "pdf" && <FileText className="w-3 h-3" />}
              {meta.type === "pptx" && <Presentation className="w-3 h-3" />}
              {meta.type === "docx" && <FileText className="w-3 h-3" />}
              {meta.type === "xlsx" && <FileSpreadsheet className="w-3 h-3" />}
              {(meta.type === "txt" || meta.type === "file") && <File className="w-3 h-3" />}
              {meta.badge}
            </span>

            {/* Category Badge */}
            {file.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-black/5 dark:bg-white/10 text-foreground/80 border border-black/5 dark:border-white/10">
                {file.category}
              </span>
            )}

            {/* Admin-only Lock Icon & Private Badge */}
            {isAdmin && isPrivate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Lock className="w-3 h-3" />
                Private
              </span>
            )}
          </div>

          {/* Quick Share Button */}
          {(!isPrivate || isAdmin) && (
            <button
              onClick={handleShare}
              aria-label="Copy document share link"
              title="Copy share link"
              className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Title */}
        <Link href={`/file/${file.id}`} className="block group/title mt-1">
          <h3 className="text-base sm:text-lg font-black text-foreground line-clamp-2 leading-snug group-hover/title:text-primary transition-colors tracking-tight">
            {file.title}
          </h3>
        </Link>
      </div>

      {/* Meta & Actions Footer */}
      <div className="relative z-10 mt-5 pt-3.5 border-t border-border/40 flex flex-col gap-3">
        {/* Metadata info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums font-medium">
          <span>{formatBytes(file.size_bytes)}</span>
          <span>{formatDate(file.created_at)}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/file/${file.id}`}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-98 ${currentTheme.viewBtn}`}
          >
            <Eye className="w-3.5 h-3.5 text-white" />
            <span>View</span>
          </Link>

          <a
            href={downloadUrl}
            download
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white dark:bg-[#1f1e30] dark:hover:bg-[#27263c] text-foreground transition-all active:scale-98 border border-border/60 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function FileCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border/60 bg-card p-5 sm:p-6 animate-pulse">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="size-8 bg-muted rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded w-3/4" />
          <div className="h-5 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
        <div className="flex justify-between">
          <div className="h-3 w-12 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-muted rounded-xl" />
          <div className="h-8 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
}
