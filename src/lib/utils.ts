import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a byte size into a human-readable string (e.g. 2.4 MB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats a date ISO string to friendly relative or readable format.
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? "Just now" : `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "Recently";
  }
}

/**
 * Extracts and normalizes file extension with leading dot.
 */
export function getFileExtension(filename: string): string {
  const ext = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 1).toLowerCase();
  return ext ? `.${ext}` : "";
}

/**
 * Sanitizes file names to remove dangerous path traversal or special characters.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\.+/g, ".")
    .trim();
}

/**
 * Validates that file extension and MIME type match allowed storage formats.
 * Supports PDF, PowerPoint (PPTX, PPT), Word (DOCX, DOC), Excel (XLSX, XLS, CSV), and text files.
 */
export function validateFileType(
  filename: string,
  mimeType: string
): { valid: boolean; error?: string; detectedType?: string } {
  const ext = getFileExtension(filename);

  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      valid: false,
      error: `Unsupported file format "${ext}". Supported: PDF, Word (.docx, .doc), Excel (.xlsx, .xls, .csv), and PowerPoint (.pptx, .ppt).`,
    };
  }

  const normalizedMime = mimeType.toLowerCase();
  const matchedType = ALLOWED_MIME_TYPES[normalizedMime];

  if (ext === ".pdf") {
    return { valid: true, detectedType: "pdf" };
  } else if (ext === ".pptx" || ext === ".ppt") {
    return { valid: true, detectedType: "pptx" };
  } else if (ext === ".docx" || ext === ".doc") {
    return { valid: true, detectedType: "docx" };
  } else if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
    return { valid: true, detectedType: "xlsx" };
  } else if (ext === ".txt") {
    return { valid: true, detectedType: "txt" };
  }

  return { valid: true, detectedType: matchedType || "other" };
}

/**
 * Returns user-facing badge metadata and category classification for any stored document.
 */
export function getFileMeta(title: string, mimeType: string = ""): {
  badge: string;
  badgeClass: string;
  type: "pdf" | "pptx" | "docx" | "xlsx" | "txt" | "file";
} {
  const lowerTitle = title.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.includes("pdf") || lowerTitle.endsWith(".pdf")) {
    return {
      badge: "PDF",
      badgeClass: "bg-rose-500/10 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/25",
      type: "pdf",
    };
  }
  if (
    lowerMime.includes("presentation") ||
    lowerMime.includes("powerpoint") ||
    lowerTitle.endsWith(".pptx") ||
    lowerTitle.endsWith(".ppt")
  ) {
    return {
      badge: "PPTX",
      badgeClass: "bg-amber-500/10 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/25",
      type: "pptx",
    };
  }
  if (
    lowerMime.includes("word") ||
    lowerMime.includes("document") ||
    lowerTitle.endsWith(".docx") ||
    lowerTitle.endsWith(".doc")
  ) {
    return {
      badge: "DOCX",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-500/25",
      type: "docx",
    };
  }
  if (
    lowerMime.includes("spreadsheet") ||
    lowerMime.includes("excel") ||
    lowerMime.includes("csv") ||
    lowerTitle.endsWith(".xlsx") ||
    lowerTitle.endsWith(".xls") ||
    lowerTitle.endsWith(".csv")
  ) {
    return {
      badge: lowerTitle.endsWith(".csv") ? "CSV" : "EXCEL",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/25",
      type: "xlsx",
    };
  }
  if (lowerMime.includes("text/plain") || lowerTitle.endsWith(".txt")) {
    return {
      badge: "TXT",
      badgeClass: "bg-slate-500/10 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-500/25",
      type: "txt",
    };
  }

  return {
    badge: "FILE",
    badgeClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-500/25",
    type: "file",
  };
}
