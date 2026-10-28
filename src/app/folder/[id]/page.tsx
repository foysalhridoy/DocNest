"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FolderDetailsResponse } from "@/types";
import { FolderCard } from "@/components/FolderCard";
import { FileCard } from "@/components/FileCard";
import {
  Folder,
  FolderLock,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  Lock,
} from "lucide-react";

function FolderPageContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<FolderDetailsResponse | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check admin session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((me) => {
        if (me.authenticated) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch folder details
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`/api/folders/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Folder not found");
        }
        return res.json();
      })
      .then((resData) => {
        if (resData.success && resData.data) {
          setData(resData.data);
        } else {
          setError(resData.error || "Failed to load folder");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Folder not found");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded-full" />
        <div className="h-10 w-1/2 bg-muted rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-3xl" />
          ))}
        </div>
      </main>
    );
  }

  // If folder is not found or private (for non-admin), display standard 404
  if (error || !data || !data.folder) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center flex-1">
        <div className="size-16 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Folder Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The folder you are looking for does not exist or may have been removed.
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

  const { folder, breadcrumbs, subfolders, files } = data;
  const isPrivate = folder.is_private || folder.is_effectively_private;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full flex-1 space-y-8">
      {/* Breadcrumb Navigation Trail */}
      <nav className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground overflow-x-auto py-1">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          const href = crumb.id ? `/folder/${crumb.id}` : "/";

          return (
            <div key={crumb.id || "root"} className="flex items-center gap-2 shrink-0">
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
              {isLast ? (
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  {crumb.name}
                  {isAdmin && crumb.is_private && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Lock className="w-2.5 h-2.5" />
                      Private
                    </span>
                  )}
                </span>
              ) : (
                <Link
                  href={href}
                  className="hover:text-foreground transition-colors hover:underline"
                >
                  {crumb.name}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Folder Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div
            className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isPrivate && isAdmin
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}
          >
            {isPrivate && isAdmin ? (
              <FolderLock className="w-6 h-6" />
            ) : (
              <Folder className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {folder.name}
              </h1>
              {isAdmin && isPrivate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Lock className="w-3 h-3" />
                  Private Folder
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground pt-0.5">
              Contains {subfolders.length} subfolder{subfolders.length === 1 ? "" : "s"} and {files.length} document{files.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Resources</span>
        </Link>
      </div>

      {/* Subfolders Section (if any) */}
      {subfolders.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            Subfolders
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subfolders.map((sf) => (
              <FolderCard key={sf.id} folder={sf} isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      )}

      {/* Files Section */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Documents in this Folder
        </h2>

        {files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => (
              <FileCard key={file.id} file={file} isAdmin={isAdmin} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border/80 bg-card p-12 text-center text-muted-foreground">
            <p className="text-sm">No files uploaded to this folder yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default function FolderPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
          <div className="h-6 w-48 bg-muted rounded-full mb-6 animate-pulse" />
          <div className="h-10 w-1/2 bg-muted rounded-2xl mb-8 animate-pulse" />
        </main>
      }
    >
      <FolderPageContent />
    </Suspense>
  );
}

