export type FileType = "all" | "pdf" | "pptx" | "docx" | "xlsx" | "doc" | "other";

export interface FolderRecord {
  id: string;
  name: string;
  parent_id: string | null;
  is_private: boolean;
  created_at: string;
  // Computed / aggregated attributes
  item_count?: number;
  file_count?: number;
  subfolder_count?: number;
  is_effectively_private?: boolean;
}

export interface FileRecord {
  id: string;
  title: string;
  drive_slot: 1 | 2;
  drive_file_id: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  created_at: string;
  folder_id?: string | null;
  is_private: boolean;
  is_effectively_private?: boolean;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
  is_private?: boolean;
}

export interface FolderDetailsResponse {
  folder: FolderRecord | null;
  breadcrumbs: BreadcrumbItem[];
  subfolders: FolderRecord[];
  files: FileRecord[];
  totalFiles: number;
  totalSubfolders: number;
}

export interface DriveSlotInfo {
  slot: 1 | 2;
  name: string;
  email: string;
  folderId: string;
  usedBytes: number;
  totalBytes: number;
  usagePercent: number;
  status: "active" | "standby" | "full" | "unconfigured";
  configured: boolean;
}

export interface UploadInitiateResponse {
  uploadUrl: string;
  driveSlot: 1 | 2;
  folderId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FileListResponse {
  files: FileRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
