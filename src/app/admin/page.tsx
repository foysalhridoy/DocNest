"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileRecord, FolderRecord, DriveSlotInfo } from "@/types";
import { formatBytes, formatDate, getFileMeta } from "@/lib/utils";
import { StorageStatsBar } from "@/components/StorageStatsBar";
import { UploadZone } from "@/components/UploadZone";
import { RenameModal } from "@/components/RenameModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { FolderPrivacyModal } from "@/components/FolderPrivacyModal";
import { CreateFolderModal } from "@/components/CreateFolderModal";
import { FolderCard } from "@/components/FolderCard";
import { useToast } from "@/components/Toast";
import {
  Shield,
  LogOut,
  Search,
  RefreshCw,
  FileText,
  Presentation,
  FileSpreadsheet,
  File,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  Download,
  HardDrive,
  FolderOpen,
  FolderPlus,
  Lock,
  Globe,
  Filter,
  CheckSquare,
  Square,
  MoreVertical,
  X,
  AlertTriangle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [drives, setDrives] = useState<DriveSlotInfo[]>([]);
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [loadingDrives, setLoadingDrives] = useState(true);

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [search, setSearch] = useState("");
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "only_private" | "only_public">("all");

  // Selection state for bulk operations
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Modals state
  const [renameTarget, setRenameTarget] = useState<FileRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [privacyFolderTarget, setPrivacyFolderTarget] = useState<FolderRecord | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  // Active context menu for file rows
  const [activeFileMenuId, setActiveFileMenuId] = useState<string | null>(null);

  // Fetch drive storage info
  const loadDrives = useCallback(async () => {
    setLoadingDrives(true);
    try {
      const res = await fetch("/api/admin/drives");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setDrives(data.data.drives);
        setActiveSlot(data.data.activeSlot);
      }
    } catch {
      console.warn("Could not load drive stats");
    } finally {
      setLoadingDrives(false);
    }
  }, [router]);

  // Fetch folders for admin
  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      if (data.success) {
        setFolders(data.data);
      }
    } catch {
      console.warn("Failed to load folders");
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  // Fetch files list for admin table
  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const query = privacyFilter === "only_private" ? "?limit=100&onlyPrivate=true" : "?limit=100";
      const res = await fetch(`/api/files${query}`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.data.files);
      }
    } catch {
      toastError("Failed to fetch files");
    } finally {
      setLoadingFiles(false);
    }
  }, [privacyFilter, toastError]);

  useEffect(() => {
    loadDrives();
    loadFolders();
    loadFiles();
  }, [loadDrives, loadFolders, loadFiles]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      success("Logged out successfully");
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    }
  };

  // Toggle single file privacy
  const handleToggleFilePrivacy = async (file: FileRecord) => {
    const isCurrentlyPrivate = file.is_private || file.is_effectively_private;
    const targetIsPrivate = !isCurrentlyPrivate;

    try {
      const res = await fetch("/api/admin/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "file",
          targetId: file.id,
          isPrivate: targetIsPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update privacy");
      }

      success(`File marked as ${targetIsPrivate ? "Private" : "Public"}`);
      loadFiles();
      loadFolders();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error updating privacy");
    } finally {
      setActiveFileMenuId(null);
    }
  };

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const isEffPrivate = f.is_private || f.is_effectively_private;

      // Privacy filter
      if (privacyFilter === "only_private" && !isEffPrivate) return false;
      if (privacyFilter === "only_public" && isEffPrivate) return false;

      // Search filter
      const matchesSearch =
        f.title.toLowerCase().includes(search.toLowerCase()) ||
        f.category.toLowerCase().includes(search.toLowerCase());

      return matchesSearch;
    });
  }, [files, privacyFilter, search]);

  // Filtered folders
  const filteredFolders = useMemo(() => {
    return folders.filter((f) => {
      const isEffPrivate = f.is_private || f.is_effectively_private;
      if (privacyFilter === "only_private" && !isEffPrivate) return false;
      if (privacyFilter === "only_public" && isEffPrivate) return false;
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [folders, privacyFilter, search]);

  // Bulk selection helpers
  const toggleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const toggleSelectFile = (id: string) => {
    const updated = new Set(selectedFileIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedFileIds(updated);
  };

  const toggleSelectFolder = (folder: FolderRecord) => {
    const updated = new Set(selectedFolderIds);
    if (updated.has(folder.id)) {
      updated.delete(folder.id);
    } else {
      updated.add(folder.id);
    }
    setSelectedFolderIds(updated);
  };

  const totalSelectedCount = selectedFileIds.size + selectedFolderIds.size;

  // Bulk privacy action
  const handleBulkSetPrivacy = async (isPrivate: boolean) => {
    if (totalSelectedCount === 0) return;
    setBulkProcessing(true);

    try {
      const items: Array<{ type: "folder" | "file"; id: string }> = [];
      selectedFolderIds.forEach((id) => items.push({ type: "folder", id }));
      selectedFileIds.forEach((id) => items.push({ type: "file", id }));

      const res = await fetch("/api/admin/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          isPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Bulk privacy update failed");
      }

      success(`Successfully set ${isPrivate ? "Private" : "Public"} for ${items.length} selected item(s).`);
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
      loadFiles();
      loadFolders();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Bulk update error");
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full flex-1 space-y-10">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <span className="size-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Admin Portal
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage library uploads, privacy access, dual-drive capacity, and academic folders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadDrives();
              loadFolders();
              loadFiles();
              success("Data refreshed");
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all active:scale-95"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDrives ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Storage Quotas Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Google Drive Storage Fleet
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Switch threshold: <strong>90%</strong>
          </span>
        </div>

        <StorageStatsBar
          drives={drives}
          activeSlot={activeSlot}
          refreshing={loadingDrives}
          onRefresh={loadDrives}
        />
      </section>

      {/* Upload Section */}
      <section>
        <UploadZone
          folders={folders}
          onUploadSuccess={() => {
            loadFiles();
            loadFolders();
            loadDrives();
          }}
        />
      </section>

      {/* Folders Management Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              Folders & Departments
            </h2>
            <p className="text-xs text-muted-foreground">
              {folders.length} folder{folders.length === 1 ? "" : "s"} available. Subtrees inherit privacy rules.
            </p>
          </div>

          <button
            onClick={() => setIsCreateFolderOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white shadow-sm shadow-indigo-500/25 transition-all self-start sm:self-auto active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
        </div>

        {filteredFolders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isAdmin={true}
                selected={selectedFolderIds.has(folder.id)}
                onSelectToggle={toggleSelectFolder}
                onTogglePrivacy={() => setPrivacyFolderTarget(folder)}
                onDelete={async (f) => {
                  if (confirm(`Are you sure you want to delete folder "${f.name}" and all its contents?`)) {
                    await fetch(`/api/admin/folders?id=${f.id}`, { method: "DELETE" });
                    success("Folder deleted");
                    loadFolders();
                    loadFiles();
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl border border-dashed border-border bg-card/40 text-center text-xs text-muted-foreground">
            No folders matching current filter.
          </div>
        )}
      </section>

      {/* Bulk Action Sticky Bar */}
      {totalSelectedCount > 0 && (
        <div className="sticky top-18 sm:top-20 z-40 p-3.5 sm:p-4 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="size-7 sm:size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
              {totalSelectedCount}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {totalSelectedCount} item{totalSelectedCount === 1 ? "" : "s"} selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkSetPrivacy(true)}
              disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Make Private</span>
            </button>

            <button
              onClick={() => handleBulkSetPrivacy(false)}
              disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Make Public</span>
            </button>

            <button
              onClick={() => {
                setSelectedFileIds(new Set());
                setSelectedFolderIds(new Set());
              }}
              disabled={bulkProcessing}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-auto sm:ml-0"
              title="Deselect all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* File Management Table */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Document Library Manager
            </h2>
            <p className="text-xs text-muted-foreground">
              Total {filteredFiles.length} documents matching view.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            {/* Privacy Filter Dropdown */}
            <div className="flex items-center justify-between gap-1.5 bg-card border border-border/80 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-primary" />
                <span className="sm:hidden font-medium">Filter:</span>
              </div>
              <select
                value={privacyFilter}
                onChange={(e) => setPrivacyFilter(e.target.value as "all" | "only_private" | "only_public")}
                className="bg-transparent text-foreground font-medium outline-none cursor-pointer text-xs"
              >
                <option value="all">All Items</option>
                <option value="only_private">🔒 Only Private</option>
                <option value="only_public">🌐 Only Public</option>
              </select>
            </div>

            {/* Table Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="w-full h-9 pl-9 pr-3 rounded-full border border-border/80 bg-card text-foreground text-xs focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[680px] text-left text-xs sm:text-sm">
              <thead className="border-b border-border/60 bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedFileIds.size > 0 &&
                        selectedFileIds.size === filteredFiles.length
                      }
                      onChange={toggleSelectAll}
                      aria-label="Select all documents"
                      className="size-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Title & Privacy</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Drive Slot</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5">Uploaded</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loadingFiles ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4">
                        <div className="size-4 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 w-12 bg-muted rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-48 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-16 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-12 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-16 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 bg-muted rounded" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-7 w-20 bg-muted rounded-full ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => {
                    const meta = getFileMeta(file.title, file.mime_type);
                    const isPrivate = file.is_private || file.is_effectively_private;
                    const isSelected = selectedFileIds.has(file.id);

                    // For private files, stream via authenticated route
                    const previewUrl = isPrivate
                      ? `/api/admin/file/${file.id}/stream`
                      : `/file/${file.id}`;
                    const downloadUrl = isPrivate
                      ? `/api/admin/file/${file.id}/stream?download=true`
                      : `/api/files/${file.id}/download`;

                    return (
                      <tr
                        key={file.id}
                        className={`transition-colors group ${
                          isSelected
                            ? "bg-primary/5"
                            : isPrivate
                            ? "bg-amber-500/[0.015] hover:bg-amber-500/[0.04]"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectFile(file.id)}
                            aria-label={`Select ${file.title}`}
                            className="size-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                          />
                        </td>

                        {/* Type badge */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.badgeClass}`}
                          >
                            {meta.type === "pdf" && <FileText className="w-3 h-3" />}
                            {meta.type === "pptx" && <Presentation className="w-3 h-3" />}
                            {meta.type === "docx" && <FileText className="w-3 h-3" />}
                            {meta.type === "xlsx" && <FileSpreadsheet className="w-3 h-3" />}
                            {(meta.type === "txt" || meta.type === "file") && <File className="w-3 h-3" />}
                            {meta.badge}
                          </span>
                        </td>

                        {/* Title with link & Private Badge */}
                        <td className="px-5 py-4 max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/file/${file.id}`}
                              className="font-semibold text-foreground hover:text-primary transition-colors hover:underline truncate"
                              title={file.title}
                            >
                              {file.title}
                            </Link>

                            {isPrivate && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0"
                                title={
                                  file.is_private
                                    ? "Individually private file"
                                    : "Inherited private status from parent folder"
                                }
                              >
                                <Lock className="w-2.5 h-2.5" />
                                Private
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-muted border border-border/40">
                            {file.category}
                          </span>
                        </td>

                        {/* Drive Slot */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              file.drive_slot === 1
                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                            }`}
                          >
                            Slot {file.drive_slot}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="px-4 py-4 text-muted-foreground tabular-nums whitespace-nowrap">
                          {formatBytes(file.size_bytes)}
                        </td>

                        {/* Upload Date */}
                        <td className="px-4 py-4 text-muted-foreground tabular-nums whitespace-nowrap">
                          {formatDate(file.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Privacy Toggle Button */}
                            <button
                              onClick={() => handleToggleFilePrivacy(file)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isPrivate
                                  ? "text-amber-600 hover:bg-amber-500/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                              title={isPrivate ? "Make Public" : "Make Private"}
                            >
                              {isPrivate ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Globe className="w-4 h-4" />
                              )}
                            </button>

                            {/* View link */}
                            <Link
                              href={`/file/${file.id}`}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="View Document"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Direct Drive link (only for public files, or service account view) */}
                            {!file.drive_file_id.startsWith("mock_") && (
                              <a
                                href={`https://drive.google.com/file/d/${file.drive_file_id}/view`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Open in Drive"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}

                            {/* Download */}
                            <a
                              href={downloadUrl}
                              download
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>

                            {/* Rename */}
                            <button
                              onClick={() => setRenameTarget(file)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Rename Document"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteTarget(file)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      No documents found matching &quot;{search}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Rename Modal */}
      <RenameModal
        file={renameTarget}
        isOpen={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        onSuccess={() => {
          loadFiles();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        file={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => {
          loadFiles();
          loadDrives();
          loadFolders();
        }}
      />

      {/* Folder Privacy Confirmation Modal */}
      <FolderPrivacyModal
        folder={privacyFolderTarget}
        isOpen={Boolean(privacyFolderTarget)}
        onClose={() => setPrivacyFolderTarget(null)}
        onSuccess={() => {
          success("Folder privacy updated successfully");
          loadFolders();
          loadFiles();
        }}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        folders={folders}
        onClose={() => setIsCreateFolderOpen(false)}
        onSuccess={() => {
          success("Folder created successfully");
          loadFolders();
        }}
      />
    </main>
  );
}
