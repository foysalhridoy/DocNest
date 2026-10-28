"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileRecord } from "@/types";
import { formatBytes, formatDate, getFileMeta } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import {
  ArrowLeft,
  Download,
  Share2,
  ExternalLink,
  FileText,
  Presentation,
  FileSpreadsheet,
  File,
  Check,
  AlertCircle,
  Clock,
  HardDrive,
  Tag,
  Maximize2,
  Minimize2,
  Lock,
} from "lucide-react";

function FileViewerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const initialFullscreen = searchParams.get("fullscreen") === "true";

  const [file, setFile] = useState<FileRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`/api/files/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Document not found");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.data) {
          setFile(data.data);
        } else {
          setError(data.error || "Failed to load document");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Fullscreen toggle handler with HTML5 API & CSS fallback for iOS/Android
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      const el = previewContainerRef.current;
      if (el && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el && (el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
        (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (
        (document as unknown as { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void })
          .webkitFullscreenElement
      ) {
        (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      }
    }
  };

  // Sync fullscreen state with browser events and Esc key
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      if (!isNowFullscreen && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  const handleShare = async () => {
    if (!file) return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      success("Shareable link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      prompt("Copy link:", url);
    }
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="h-6 w-32 bg-muted rounded-full mb-6 animate-pulse" />
        <div className="h-10 w-2/3 bg-muted rounded-xl mb-4 animate-pulse" />
        <div className="h-6 w-1/3 bg-muted rounded-lg mb-8 animate-pulse" />
        <div className="w-full h-[650px] bg-muted rounded-3xl animate-pulse" />
      </main>
    );
  }

  if (error || !file) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center flex-1">
        <div className="size-16 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Document Unavailable</h2>
        <p className="text-muted-foreground mb-6">
          {error || "The document you are looking for does not exist or may have been removed."}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>
      </main>
    );
  }

  const meta = getFileMeta(file.title, file.mime_type);
  const isPrivate = file.is_private || file.is_effectively_private;

  // For private files, use authenticated server-side streaming route instead of public Drive preview link
  const previewUrl =
    isPrivate && isAdmin
      ? `/api/admin/file/${file.id}/stream`
      : `https://drive.google.com/file/d/${file.drive_file_id}/preview`;

  const downloadUrl =
    isPrivate && isAdmin
      ? `/api/admin/file/${file.id}/stream?download=true`
      : `/api/files/${file.id}/download`;

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 w-full flex-1 flex flex-col">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to File Library
        </Link>

        <span className="text-xs text-muted-foreground font-mono">
          Slot {file.drive_slot} Storage
        </span>
      </div>

      {/* Header Info & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-6 border-b border-border/60 mb-6">
        <div className="space-y-2">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${meta.badgeClass}`}
            >
              {meta.type === "pdf" && <FileText className="w-3.5 h-3.5" />}
              {meta.type === "pptx" && <Presentation className="w-3.5 h-3.5" />}
              {meta.type === "docx" && <FileText className="w-3.5 h-3.5" />}
              {meta.type === "xlsx" && <FileSpreadsheet className="w-3.5 h-3.5" />}
              {(meta.type === "txt" || meta.type === "file") && <File className="w-3.5 h-3.5" />}
              {meta.badge} File
            </span>

            {file.category && (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                <Tag className="w-3 h-3" />
                {file.category}
              </span>
            )}

            {/* Admin-only Lock Icon & Private Badge */}
            {isAdmin && isPrivate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Lock className="w-3.5 h-3.5" />
                Private Document
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight max-w-3xl break-words">
            {file.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground tabular-nums pt-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              {formatBytes(file.size_bytes)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Uploaded {formatDate(file.created_at)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Share button */}
          {(!isPrivate || isAdmin) && (
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-border/80 bg-card hover:bg-muted text-foreground transition-all active:scale-95 shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Link</span>
                </>
              )}
            </button>
          )}

          {/* Open In Drive button (only for non-private or admin) */}
          {(!isPrivate || isAdmin) && file.drive_file_id && (
            <a
              href={`https://drive.google.com/file/d/${file.drive_file_id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-border/80 bg-card hover:bg-muted text-foreground transition-all active:scale-95 shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in Drive</span>
            </a>
          )}

          {/* Primary Download button */}
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#4338ca] hover:bg-[#3730a3] dark:bg-[#5d4fe6] dark:hover:bg-[#4f41d9] text-white shadow-sm transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Embedded Document Preview Container (Responsive & Full Screen on All Devices) */}
      <div
        ref={previewContainerRef}
        className={
          isFullscreen
            ? "fixed inset-0 z-[100] h-screen w-screen bg-[#0e0d15] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
            : "flex-1 w-full relative rounded-3xl overflow-hidden border border-border/80 bg-card shadow-lg min-h-[420px] sm:min-h-[580px] lg:min-h-[720px] flex flex-col"
        }
      >
        {/* Fullscreen Dedicated Top Bar */}
        {isFullscreen && (
          <div className="h-14 sm:h-16 px-4 sm:px-6 bg-[#161522] border-b border-[#262438] flex items-center justify-between gap-4 z-30 shrink-0 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase shadow-2xs ${meta.badgeClass}`}
              >
                {meta.badge}
              </span>
              <h2 className="text-xs sm:text-sm font-bold truncate max-w-xs sm:max-w-md md:max-w-xl text-white">
                {file.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#4338ca] hover:bg-[#3730a3] text-white shadow-sm transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all active:scale-95 cursor-pointer"
                title="Exit Full Screen (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>
        )}

        {/* Regular Floating Fullscreen Pill Button inside Preview Container */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-background/90 hover:bg-background text-foreground backdrop-blur-md border border-border/80 shadow-md transition-all active:scale-95 cursor-pointer"
            title="Expand to Full Screen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-primary" />
            <span>Full Screen</span>
          </button>
        )}

        {/* Loading Spinner */}
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 dark:bg-[#161522]/90 backdrop-blur-xs">
            <div className="size-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin mb-3" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Loading preview for {file.title}...
            </p>
          </div>
        )}

        {/* Iframe Document Viewer */}
        <iframe
          src={previewUrl}
          title={`Preview of ${file.title}`}
          className={`w-full flex-1 border-0 ${isFullscreen ? "rounded-none" : "rounded-3xl"}`}
          allow="autoplay; fullscreen"
          onLoad={() => setIframeLoaded(true)}
        />
      </div>

      {/* Helper text */}
      {!isFullscreen && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <p>
            {isPrivate && isAdmin
              ? "Secure preview streamed via service account. Only authorized administrators can access this file."
              : "Preview rendered via Google Drive viewer. Click 'Full Screen' to read distraction-free, or 'Download File' to save locally."}
          </p>
        </div>
      )}
    </main>
  );
}

export default function FileViewerPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
          <div className="h-6 w-32 bg-muted rounded-full mb-6 animate-pulse" />
          <div className="h-10 w-2/3 bg-muted rounded-xl mb-4 animate-pulse" />
          <div className="h-6 w-1/3 bg-muted rounded-lg mb-8 animate-pulse" />
        </main>
      }
    >
      <FileViewerContent />
    </Suspense>
  );
}