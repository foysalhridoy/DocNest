"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, Presentation, FileSpreadsheet, File, CheckCircle2, AlertCircle, X, Sparkles, Folder, Lock } from "lucide-react";
import { useToast } from "./Toast";
import { formatBytes, validateFileType, getFileMeta } from "@/lib/utils";
import { DEFAULT_CATEGORIES, MAX_FILE_SIZE_BYTES } from "@/lib/config";
import { FolderRecord } from "@/types";

interface UploadZoneProps {
  onUploadSuccess: () => void;
  folders?: FolderRecord[];
  currentFolderId?: string | null;
}

export function UploadZone({ onUploadSuccess, folders = [], currentFolderId = null }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [targetFolderId, setTargetFolderId] = useState<string>(currentFolderId || "root");
  const [isPrivateManual, setIsPrivateManual] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const activeFolder = folders.find((f) => f.id === targetFolderId);
  const folderIsPrivate = Boolean(activeFolder?.is_private || activeFolder?.is_effectively_private);
  const isPrivateEffective = folderIsPrivate || isPrivateManual;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const validation = validateFileType(file.name, file.type);
    if (!validation.valid) {
      toastError(validation.error || "Only .pdf and .pptx files are allowed");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toastError(`File exceeds maximum limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`);
      return;
    }

    setSelectedFile(file);
    // Remove extension for default title suggestion
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "");
    setTitle(cleanBaseName);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle("");
    setCategory("General");
    setUploading(false);
    setProgress(0);
    setStatusMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setProgress(5);
    setStatusMessage("Initiating upload session...");

    try {
      // Step 1: Initiate upload with the server
      const initRes = await fetch("/api/admin/upload/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          mimeType: selectedFile.type || "application/octet-stream",
          sizeBytes: selectedFile.size,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error || "Failed to initiate upload session");
      }

      const { uploadUrl, driveSlot, mock } = initData.data;

      // Handle demo/mock mode
      if (mock) {
        setProgress(50);
        setStatusMessage("Simulating upload in demonstration mode...");
        await new Promise((r) => setTimeout(r, 1200));

        // Confirm
        const confirmRes = await fetch("/api/admin/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || selectedFile.name,
            driveSlot: 1,
            driveFileId: `mock_file_${Date.now()}`,
            mimeType: selectedFile.type || "application/pdf",
            sizeBytes: selectedFile.size,
            category,
            folderId: targetFolderId === "root" ? null : targetFolderId,
            isPrivate: isPrivateEffective,
          }),
        });
        const confirmData = await confirmRes.json();
        if (!confirmRes.ok || !confirmData.success) {
          throw new Error(confirmData.error || "Failed to confirm upload");
        }

        setProgress(100);
        success("Document uploaded successfully!");
        resetForm();
        onUploadSuccess();
        return;
      }

      // Step 2: Stream directly to Google Drive via resumable upload URL
      setStatusMessage("Uploading directly to Google Drive...");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", selectedFile.type || "application/octet-stream");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 90);
            setProgress(Math.max(10, percent));
          }
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const driveFile = JSON.parse(xhr.responseText);
              const driveFileId = driveFile.id;

              setProgress(95);
              setStatusMessage("Setting public access permissions and saving...");

              // Step 3: Confirm with server and insert row into Supabase
              const confirmRes = await fetch("/api/admin/upload/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: title.trim() || selectedFile.name,
                  driveSlot,
                  driveFileId,
                  mimeType: selectedFile.type || "application/octet-stream",
                  sizeBytes: selectedFile.size,
                  category,
                  folderId: targetFolderId === "root" ? null : targetFolderId,
                  isPrivate: isPrivateEffective,
                }),
              });

              const confirmData = await confirmRes.json();
              if (!confirmRes.ok || !confirmData.success) {
                reject(new Error(confirmData.error || "Failed to confirm file record"));
                return;
              }

              resolve();
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Drive upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during Drive direct upload"));
        xhr.send(selectedFile);
      });

      setProgress(100);
      success("Document uploaded and published successfully!");
      resetForm();
      onUploadSuccess();
    } catch (err) {
      console.error("[DocNest] Upload error:", err);
      toastError(err instanceof Error ? err.message : "Failed to upload file");
      setUploading(false);
      setProgress(0);
      setStatusMessage("");
    }
  };

  const fileMeta = selectedFile ? getFileMeta(selectedFile.name, selectedFile.type) : null;

  return (
    <div className="rounded-[2rem] border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Upload Files</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Files are stored in Google Drive and indexed in Supabase. Direct resumable upload handles large files up to 100 MB.
          </p>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          Direct Drive Stream
        </span>
      </div>

      <form onSubmit={handleUpload} className="space-y-6">
        {/* Drag and Drop Box */}
        {!selectedFile ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]"
                : "border-border/80 hover:border-indigo-500/50 hover:bg-muted/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="size-14 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              Drag and drop your file here, or browse
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 max-w-md mx-auto">
              Supports <strong>PDF</strong>, Word (<strong>.docx, .doc</strong>), Excel (<strong>.xlsx, .xls, .csv</strong>), and PowerPoint (<strong>.pptx, .ppt</strong>) up to 100 MB
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Select from computer</span>
            </div>
          </div>
        ) : (
          /* Selected File Preview Box */
          <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                className={`size-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  fileMeta?.badgeClass || "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                }`}
              >
                {fileMeta?.type === "pdf" && <FileText className="w-6 h-6" />}
                {fileMeta?.type === "pptx" && <Presentation className="w-6 h-6" />}
                {fileMeta?.type === "docx" && <FileText className="w-6 h-6" />}
                {fileMeta?.type === "xlsx" && <FileSpreadsheet className="w-6 h-6" />}
                {(fileMeta?.type === "txt" || fileMeta?.type === "file") && <File className="w-6 h-6" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatBytes(selectedFile.size)} • {fileMeta?.badge || "Document"} File
                </p>
              </div>
            </div>

            {!uploading && (
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Inputs (Title & Category) */}
        {selectedFile && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="document-title"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Display Title
              </label>
              <input
                id="document-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
                placeholder="Descriptive title or document name..."
                required
                className="w-full h-11 px-4 rounded-xl border border-border/80 bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="document-category"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Category
              </label>
              <select
                id="document-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={uploading}
                className="w-full h-11 px-3 rounded-xl border border-border/80 bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                {DEFAULT_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Folder Destination & Privacy Setting */}
        {selectedFile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {folders.length > 0 && (
              <div>
                <label
                  htmlFor="document-folder"
                  className="block text-xs font-semibold text-foreground mb-1.5"
                >
                  Destination Folder
                </label>
                <select
                  id="document-folder"
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  disabled={uploading}
                  className="w-full h-11 px-3 rounded-xl border border-border/80 bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="root">Root (No Folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.is_private || f.is_effectively_private ? "🔒 (Private)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isPrivateEffective}
                  disabled={uploading || folderIsPrivate}
                  onChange={(e) => setIsPrivateManual(e.target.checked)}
                  className="size-4 rounded text-primary focus:ring-primary/20 border-border cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Mark as Private
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {folderIsPrivate
                      ? "Automatically private (inherited from folder)"
                      : "File will only be accessible to administrators"}
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="space-y-2 pt-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-foreground">{statusMessage || "Uploading..."}</span>
              <span className="text-primary font-bold tabular-nums">{progress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {selectedFile && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={uploading}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={uploading || !title.trim()}
              className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-98"
            >
              {uploading ? (
                <>
                  <div className="size-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Uploading to Drive...</span>
                </>
              ) : (
                <span>Upload and Publish</span>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
