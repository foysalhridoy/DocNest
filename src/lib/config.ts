export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".pptx",
  ".ppt",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".csv",
  ".txt",
] as const;

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
  "text/plain": "txt",
};

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB max for resumable uploads
export const DIRECT_UPLOAD_MAX_BYTES = 4.5 * 1024 * 1024; // 4.5 MB for direct proxy uploads to comply with Vercel serverless limit

export const DEFAULT_CATEGORIES = [
  "All",
  "Documents",
  "Spreadsheets",
  "Presentations",
  "Projects",
  "Work",
  "Personal",
  "Finance",
  "Archives",
  "General",
] as const;

export interface DriveConfigItem {
  slot: 1 | 2;
  name: string;
  emailEnvKey: string;
  privateKeyEnvKey: string;
  folderIdEnvKey: string;
}

// Drives configuration array: extensible for DRIVE_3, DRIVE_4 in the future
export const DRIVE_CONFIGS: DriveConfigItem[] = [
  {
    slot: 1,
    name: "Primary Drive (Slot 1)",
    emailEnvKey: "GOOGLE_SA_1_EMAIL",
    privateKeyEnvKey: "GOOGLE_SA_1_PRIVATE_KEY",
    folderIdEnvKey: "GOOGLE_FOLDER_1_ID",
  },
  {
    slot: 2,
    name: "Secondary Drive (Slot 2)",
    emailEnvKey: "GOOGLE_SA_2_EMAIL",
    privateKeyEnvKey: "GOOGLE_SA_2_PRIVATE_KEY",
    folderIdEnvKey: "GOOGLE_FOLDER_2_ID",
  },
];

export const DRIVE_SWITCH_THRESHOLD_PERCENT = 90; // Switch to Slot 2 when Drive 1 reaches 90%
