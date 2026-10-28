import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { FileRecord, FileListResponse, FolderRecord, BreadcrumbItem } from "@/types";

// In-memory demo data for folders
// In-memory demo data for folders (universal cloud storage)
let mockFolders: FolderRecord[] = [
  {
    id: "folder-1",
    name: "Project Documents & Architecture",
    parent_id: null,
    is_private: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "folder-2",
    name: "Confidential Private Vault",
    parent_id: null,
    is_private: true,
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "folder-3",
    name: "Contracts & Financial Records",
    parent_id: "folder-2", // Child of private folder -> effectively private
    is_private: false,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "folder-4",
    name: "Financial Reports & Spreadsheets",
    parent_id: null,
    is_private: false,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "folder-5",
    name: "Presentations & Pitches",
    parent_id: "folder-1",
    is_private: false,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// In-memory demo data for files (PDF, PPTX, DOCX, XLSX, TXT)
let mockFiles: FileRecord[] = [
  {
    id: "doc-1",
    title: "Product Architecture & System Design Overview",
    drive_slot: 1,
    drive_file_id: "1mock_drive_file_id_arch",
    mime_type: "application/pdf",
    size_bytes: 3450200, // ~3.3 MB
    category: "Projects",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: "folder-1",
    is_private: false,
  },
  {
    id: "doc-2",
    title: "Annual Financial Statement & Projections 2026",
    drive_slot: 1,
    drive_file_id: "1mock_drive_file_id_finance_xlsx",
    mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 5240100, // ~5.0 MB
    category: "Spreadsheets",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: "folder-4",
    is_private: false,
  },
  {
    id: "doc-3",
    title: "Master Services Agreement & NDA Contract",
    drive_slot: 1,
    drive_file_id: "1mock_drive_file_id_contract_docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size_bytes: 1840500, // ~1.8 MB
    category: "Documents",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: null,
    is_private: false,
  },
  {
    id: "doc-4",
    title: "Keynote Strategy & Product Roadmap Deck 2026",
    drive_slot: 2,
    drive_file_id: "1mock_drive_file_id_keynote_pptx",
    mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size_bytes: 14200000, // ~13.5 MB
    category: "Presentations",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: "folder-5",
    is_private: false,
  },
  {
    id: "doc-5",
    title: "Operations Budget & Expense Tracker Q1-Q4",
    drive_slot: 2,
    drive_file_id: "1mock_drive_file_id_budget_xlsx",
    mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 3120000, // ~3.0 MB
    category: "Finance",
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: "folder-4",
    is_private: false,
  },
  {
    id: "doc-6",
    title: "Brand Identity, Typography & Media Guidelines",
    drive_slot: 1,
    drive_file_id: "1mock_drive_file_id_brand_pdf",
    mime_type: "application/pdf",
    size_bytes: 4890000,
    category: "Documents",
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: "folder-1",
    is_private: false,
  },
  // Private files for testing:
  {
    id: "doc-private-1",
    title: "Executive Compensation & Audit Reports 2026 - STRICTLY CONFIDENTIAL",
    drive_slot: 1,
    drive_file_id: "1mock_drive_file_audit_comp",
    mime_type: "application/pdf",
    size_bytes: 5120000,
    category: "Work",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: "folder-2", // In Confidential Private Vault
    is_private: false, // Inherits private from parent!
  },
  {
    id: "doc-private-2",
    title: "Private Equity Cap Table & Investor Share Allocations",
    drive_slot: 2,
    drive_file_id: "1mock_drive_file_captable_xlsx",
    mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 3100000,
    category: "Finance",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: "folder-3", // In subfolder of private folder
    is_private: false,
  },
  {
    id: "doc-private-standalone",
    title: "Personal Tax Returns & Asset Declarations [Encrypted]",
    drive_slot: 1,
    drive_file_id: "1mock_drive_file_tax_personal",
    mime_type: "application/pdf",
    size_bytes: 4780000,
    category: "Personal",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    folder_id: null, // Individually private!
    is_private: true,
  },
];

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

// -------------------------------------------------------------
// FOLDER & PARENT CHAIN PRIVACY HELPERS
// -------------------------------------------------------------

/**
 * Retrieves a single folder record by ID.
 */
export async function getFolderById(id: string): Promise<FolderRecord | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("folders").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return data as FolderRecord;
      }
    } catch (err) {
      console.warn("[DocNest] Supabase getFolderById error:", err);
    }
  }

  const found = mockFolders.find((f) => f.id === id);
  return found || null;
}

/**
 * Checks if a folder is effectively private by inspecting its entire parent hierarchy.
 * If the folder itself OR any ancestor in the parent chain has is_private === true,
 * it returns true. Returns false only if all ancestors up to root are public.
 */
export async function isFolderEffectivelyPrivate(folderId: string | null): Promise<boolean> {
  if (!folderId) return false;

  let currentId: string | null = folderId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      // Prevent cyclic loops
      break;
    }
    visited.add(currentId);

    const folder = await getFolderById(currentId);
    if (!folder) {
      // Non-existent folder in parent chain
      return false;
    }

    if (folder.is_private) {
      return true;
    }

    currentId = folder.parent_id;
  }

  return false;
}

/**
 * Checks if a file is effectively private:
 * Returns true if file.is_private is true, OR if its parent folder chain is private.
 */
export async function isFileEffectivelyPrivate(file: FileRecord): Promise<boolean> {
  if (file.is_private) return true;
  if (!file.folder_id) return false;
  return await isFolderEffectivelyPrivate(file.folder_id);
}

/**
 * Retrieves the full subtree of a folder (all descendant folders and all files contained within).
 */
export async function getFolderSubtree(folderId: string): Promise<{
  folders: FolderRecord[];
  files: FileRecord[];
}> {
  const descendantFolders: FolderRecord[] = [];
  const descendantFiles: FileRecord[] = [];

  const targetFolder = await getFolderById(folderId);
  if (!targetFolder) {
    return { folders: [], files: [] };
  }
  descendantFolders.push(targetFolder);

  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      // Fetch all folders to traverse tree
      const { data: allFoldersData } = await supabase.from("folders").select("*");
      const allFolders = (allFoldersData || []) as FolderRecord[];

      const queue: string[] = [folderId];
      const folderIdSet = new Set<string>([folderId]);

      while (queue.length > 0) {
        const parent = queue.shift()!;
        const children = allFolders.filter((f) => f.parent_id === parent);
        for (const child of children) {
          if (!folderIdSet.has(child.id)) {
            folderIdSet.add(child.id);
            descendantFolders.push(child);
            queue.push(child.id);
          }
        }
      }

      // Fetch all files inside any of these folders
      const { data: filesData } = await supabase
        .from("files")
        .select("*")
        .in("folder_id", Array.from(folderIdSet));

      if (filesData) {
        descendantFiles.push(...(filesData as FileRecord[]));
      }

      return { folders: descendantFolders, files: descendantFiles };
    } catch (err) {
      console.warn("[DocNest] Error fetching subtree from Supabase, using mock fallback:", err);
    }
  }

  // Fallback in-memory traversal
  const queue: string[] = [folderId];
  const folderIdSet = new Set<string>([folderId]);

  while (queue.length > 0) {
    const parent = queue.shift()!;
    const children = mockFolders.filter((f) => f.parent_id === parent);
    for (const child of children) {
      if (!folderIdSet.has(child.id)) {
        folderIdSet.add(child.id);
        descendantFolders.push(child);
        queue.push(child.id);
      }
    }
  }

  const filesInTree = mockFiles.filter((f) => f.folder_id && folderIdSet.has(f.folder_id));
  descendantFiles.push(...filesInTree);

  return { folders: descendantFolders, files: descendantFiles };
}

/**
 * Sets privacy for an entire folder subtree (folder itself, all subfolders, and all files).
 */
export async function setFolderPrivacySubtree(
  folderId: string,
  isPrivate: boolean
): Promise<{
  updatedFolders: FolderRecord[];
  updatedFiles: FileRecord[];
}> {
  const { folders, files } = await getFolderSubtree(folderId);
  const folderIds = folders.map((f) => f.id);
  const fileIds = files.map((f) => f.id);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      if (folderIds.length > 0) {
        await supabase
          .from("folders")
          .update({ is_private: isPrivate })
          .in("id", folderIds);
      }
      if (fileIds.length > 0) {
        await supabase
          .from("files")
          .update({ is_private: isPrivate })
          .in("id", fileIds);
      }
    } catch (err) {
      console.warn("[DocNest] Supabase setFolderPrivacySubtree error:", err);
    }
  }

  // Update in-memory mock data
  const updatedFolders: FolderRecord[] = [];
  const updatedFiles: FileRecord[] = [];

  mockFolders = mockFolders.map((f) => {
    if (folderIds.includes(f.id)) {
      const updated = { ...f, is_private: isPrivate };
      updatedFolders.push(updated);
      return updated;
    }
    return f;
  });

  mockFiles = mockFiles.map((f) => {
    if (fileIds.includes(f.id)) {
      const updated = { ...f, is_private: isPrivate };
      updatedFiles.push(updated);
      return updated;
    }
    return f;
  });

  return { updatedFolders, updatedFiles };
}

/**
 * Toggles a single file's private status.
 */
export async function setFilePrivacy(
  fileId: string,
  isPrivate: boolean
): Promise<FileRecord | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("files")
        .update({ is_private: isPrivate })
        .eq("id", fileId)
        .select()
        .maybeSingle();

      if (!error && data) {
        return data as FileRecord;
      }
    } catch (err) {
      console.warn("[DocNest] Supabase setFilePrivacy error:", err);
    }
  }

  const idx = mockFiles.findIndex((f) => f.id === fileId);
  if (idx !== -1) {
    mockFiles[idx] = { ...mockFiles[idx], is_private: isPrivate };
    return mockFiles[idx];
  }
  return null;
}

/**
 * Retrieves folders with optional parent filter and server-side privacy enforcement.
 * If includePrivate is false, all private and effectively private folders are completely excluded.
 */
export async function getFolders(
  parentId?: string | null,
  includePrivate: boolean = false,
  onlyPrivate: boolean = false
): Promise<FolderRecord[]> {
  const supabase = getSupabaseClient();
  let folderList: FolderRecord[] = [];

  if (supabase) {
    try {
      let query = supabase.from("folders").select("*");
      if (parentId !== undefined) {
        query = parentId === null ? query.is("parent_id", null) : query.eq("parent_id", parentId);
      }
      query = query.order("name", { ascending: true });

      const { data, error } = await query;
      if (!error && data) {
        folderList = data as FolderRecord[];
      }
    } catch (err) {
      console.warn("[DocNest] Supabase getFolders error, using mock:", err);
      folderList = [...mockFolders];
      if (parentId !== undefined) {
        folderList = folderList.filter((f) => (parentId === null ? f.parent_id === null : f.parent_id === parentId));
      }
    }
  } else {
    folderList = [...mockFolders];
    if (parentId !== undefined) {
      folderList = folderList.filter((f) => (parentId === null ? f.parent_id === null : f.parent_id === parentId));
    }
  }

  // Compute effective privacy and item counts for each folder
  const result: FolderRecord[] = [];
  for (const f of folderList) {
    const isEffPrivate = await isFolderEffectivelyPrivate(f.id);
    const itemCounts = await getFolderItemCounts(f.id, includePrivate);

    const folderWithMeta: FolderRecord = {
      ...f,
      is_effectively_private: isEffPrivate,
      item_count: itemCounts.total,
      file_count: itemCounts.files,
      subfolder_count: itemCounts.subfolders,
    };

    if (!includePrivate) {
      // Public view: exclude completely if effectively private
      if (!isEffPrivate) {
        result.push(folderWithMeta);
      }
    } else {
      // Admin view
      if (onlyPrivate) {
        if (isEffPrivate) {
          result.push(folderWithMeta);
        }
      } else {
        result.push(folderWithMeta);
      }
    }
  }

  return result;
}

/**
 * Calculates item counts inside a folder (subfolders and files).
 * In public mode, only public subfolders and public files are counted.
 */
export async function getFolderItemCounts(
  folderId: string,
  includePrivate: boolean = false
): Promise<{ files: number; subfolders: number; total: number }> {
  const supabase = getSupabaseClient();
  let directSubfolders: FolderRecord[] = [];
  let directFiles: FileRecord[] = [];

  if (supabase) {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        supabase.from("folders").select("*").eq("parent_id", folderId),
        supabase.from("files").select("*").eq("folder_id", folderId),
      ]);

      if (foldersRes.data) directSubfolders = foldersRes.data as FolderRecord[];
      if (filesRes.data) directFiles = filesRes.data as FileRecord[];
    } catch {
      directSubfolders = mockFolders.filter((f) => f.parent_id === folderId);
      directFiles = mockFiles.filter((f) => f.folder_id === folderId);
    }
  } else {
    directSubfolders = mockFolders.filter((f) => f.parent_id === folderId);
    directFiles = mockFiles.filter((f) => f.folder_id === folderId);
  }

  if (includePrivate) {
    return {
      subfolders: directSubfolders.length,
      files: directFiles.length,
      total: directSubfolders.length + directFiles.length,
    };
  }

  // Filter for public items
  let publicSubfolders = 0;
  for (const sf of directSubfolders) {
    if (!(await isFolderEffectivelyPrivate(sf.id))) {
      publicSubfolders++;
    }
  }

  let publicFiles = 0;
  for (const f of directFiles) {
    if (!(await isFileEffectivelyPrivate(f))) {
      publicFiles++;
    }
  }

  return {
    subfolders: publicSubfolders,
    files: publicFiles,
    total: publicSubfolders + publicFiles,
  };
}

/**
 * Generates breadcrumb navigation trail for a folder.
 */
export async function getBreadcrumbs(
  folderId: string | null,
  includePrivate: boolean = false
): Promise<BreadcrumbItem[]> {
  const crumbs: BreadcrumbItem[] = [{ id: null, name: "Home" }];
  if (!folderId) return crumbs;

  const chain: BreadcrumbItem[] = [];
  let currentId: string | null = folderId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const folder = await getFolderById(currentId);
    if (!folder) break;

    const isEffPrivate = await isFolderEffectivelyPrivate(folder.id);
    if (!includePrivate && isEffPrivate) {
      // Public cannot view breadcrumbs of private folders
      return [{ id: null, name: "Home" }];
    }

    chain.unshift({
      id: folder.id,
      name: folder.name,
      is_private: isEffPrivate,
    });

    currentId = folder.parent_id;
  }

  return [...crumbs, ...chain];
}

/**
 * Creates a new folder.
 */
export async function createFolderRecord(
  folder: Omit<FolderRecord, "created_at"> & { created_at?: string }
): Promise<FolderRecord> {
  let isPrivate = folder.is_private || false;
  // If parent folder is private, inherit private
  if (folder.parent_id) {
    const parentIsPrivate = await isFolderEffectivelyPrivate(folder.parent_id);
    if (parentIsPrivate) {
      isPrivate = true;
    }
  }

  const newRecord: FolderRecord = {
    ...folder,
    is_private: isPrivate,
    created_at: folder.created_at || new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("folders").insert(newRecord).select().single();
    if (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
    return data as FolderRecord;
  }

  mockFolders.push(newRecord);
  return newRecord;
}

/**
 * Deletes a folder and all its contents.
 */
export async function deleteFolderRecord(id: string): Promise<boolean> {
  const { folders, files } = await getFolderSubtree(id);
  const folderIds = folders.map((f) => f.id);
  const fileIds = files.map((f) => f.id);

  const supabase = getSupabaseClient();
  if (supabase) {
    if (fileIds.length > 0) {
      await supabase.from("files").delete().in("id", fileIds);
    }
    if (folderIds.length > 0) {
      await supabase.from("folders").delete().in("id", folderIds);
    }
    return true;
  }

  mockFiles = mockFiles.filter((f) => !fileIds.includes(f.id));
  mockFolders = mockFolders.filter((f) => !folderIds.includes(f.id));
  return true;
}

// -------------------------------------------------------------
// FILE QUERIES WITH SERVER-SIDE PRIVACY ENFORCEMENT
// -------------------------------------------------------------

export interface GetFilesQuery {
  search?: string;
  type?: "pdf" | "pptx" | "docx" | "xlsx";
  category?: string;
  sort?: "newest" | "oldest" | "name" | "size";
  page?: number;
  limit?: number;
  folder_id?: string | null;
  includePrivate?: boolean;
  onlyPrivate?: boolean;
}

/**
 * Fetches files list with search, filtering, sorting, pagination, and strict server-side privacy enforcement.
 */
export async function getFiles(query: GetFilesQuery = {}): Promise<FileListResponse> {
  const {
    search = "",
    type,
    category,
    sort = "newest",
    page = 1,
    limit = 12,
    folder_id,
    includePrivate = false,
    onlyPrivate = false,
  } = query;

  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let req = supabase.from("files").select("*", { count: "exact" });

      if (folder_id !== undefined) {
        req = folder_id === null ? req.is("folder_id", null) : req.eq("folder_id", folder_id);
      }

      if (search.trim()) {
        req = req.ilike("title", `%${search.trim()}%`);
      }

      if (type === "pdf") {
        req = req.eq("mime_type", "application/pdf");
      } else if (type === "pptx") {
        req = req.or(
          "mime_type.eq.application/vnd.openxmlformats-officedocument.presentationml.presentation,mime_type.eq.application/vnd.ms-powerpoint"
        );
      } else if (type === "docx") {
        req = req.or(
          "mime_type.eq.application/vnd.openxmlformats-officedocument.wordprocessingml.document,mime_type.eq.application/msword"
        );
      } else if (type === "xlsx") {
        req = req.or(
          "mime_type.eq.application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,mime_type.eq.application/vnd.ms-excel,mime_type.eq.text/csv"
        );
      }

      if (category && category !== "All") {
        req = req.eq("category", category);
      }

      // Server-side privacy filter
      if (!includePrivate) {
        req = req.eq("is_private", false);
      } else if (onlyPrivate) {
        // Handled in post-filter for complete parent-chain accuracy
      }

      switch (sort) {
        case "oldest":
          req = req.order("created_at", { ascending: true });
          break;
        case "name":
          req = req.order("title", { ascending: true });
          break;
        case "size":
          req = req.order("size_bytes", { ascending: false });
          break;
        case "newest":
        default:
          req = req.order("created_at", { ascending: false });
          break;
      }

      const { data, error } = await req;

      if (!error && data) {
        let files = data as FileRecord[];

        // Apply complete parent-chain privacy verification on every file
        const filteredList: FileRecord[] = [];
        for (const file of files) {
          const isEffPrivate = await isFileEffectivelyPrivate(file);
          const fileWithMeta = { ...file, is_effectively_private: isEffPrivate };

          if (!includePrivate) {
            // Public: exclude private completely
            if (!isEffPrivate) {
              filteredList.push(fileWithMeta);
            }
          } else {
            // Admin: check onlyPrivate filter
            if (onlyPrivate) {
              if (isEffPrivate) filteredList.push(fileWithMeta);
            } else {
              filteredList.push(fileWithMeta);
            }
          }
        }

        const total = filteredList.length;
        const from = (page - 1) * limit;
        const paginated = filteredList.slice(from, from + limit);

        return {
          files: paginated,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    } catch (err) {
      console.warn("[DocNest] Supabase connection error in getFiles:", err);
    }
  }

  // Fallback to in-memory store
  let filtered = [...mockFiles];

  if (folder_id !== undefined) {
    filtered = filtered.filter((f) => (folder_id === null ? !f.folder_id : f.folder_id === folder_id));
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((f) => f.title.toLowerCase().includes(q));
  }

  if (type === "pdf") {
    filtered = filtered.filter((f) => f.mime_type.includes("pdf"));
  } else if (type === "pptx") {
    filtered = filtered.filter(
      (f) => f.mime_type.includes("presentation") || f.mime_type.includes("powerpoint")
    );
  } else if (type === "docx") {
    filtered = filtered.filter(
      (f) => f.mime_type.includes("word") || f.mime_type.includes("document")
    );
  } else if (type === "xlsx") {
    filtered = filtered.filter(
      (f) => f.mime_type.includes("spreadsheet") || f.mime_type.includes("excel") || f.mime_type.includes("csv")
    );
  }

  if (category && category !== "All") {
    filtered = filtered.filter((f) => f.category === category);
  }

  // Server-side privacy filtering
  const privacyFiltered: FileRecord[] = [];
  for (const f of filtered) {
    const isEffPrivate = await isFileEffectivelyPrivate(f);
    const fileWithMeta = { ...f, is_effectively_private: isEffPrivate };

    if (!includePrivate) {
      if (!isEffPrivate) privacyFiltered.push(fileWithMeta);
    } else {
      if (onlyPrivate) {
        if (isEffPrivate) privacyFiltered.push(fileWithMeta);
      } else {
        privacyFiltered.push(fileWithMeta);
      }
    }
  }

  switch (sort) {
    case "oldest":
      privacyFiltered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case "name":
      privacyFiltered.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "size":
      privacyFiltered.sort((a, b) => b.size_bytes - a.size_bytes);
      break;
    case "newest":
    default:
      privacyFiltered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
  }

  const total = privacyFiltered.length;
  const start = (page - 1) * limit;
  const paginated = privacyFiltered.slice(start, start + limit);

  return {
    files: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieves a single file record by its ID with effective privacy flag attached.
 */
export async function getFileById(id: string): Promise<FileRecord | null> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.from("files").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        const file = data as FileRecord;
        const isEffPrivate = await isFileEffectivelyPrivate(file);
        return { ...file, is_effectively_private: isEffPrivate };
      }
    } catch (err) {
      console.warn("[DocNest] Supabase getFileById error:", err);
    }
  }

  const match = mockFiles.find((f) => f.id === id);
  if (!match) return null;

  const isEffPrivate = await isFileEffectivelyPrivate(match);
  return { ...match, is_effectively_private: isEffPrivate };
}

/**
 * Inserts a new file metadata record.
 */
export async function createFileRecord(
  data: Omit<FileRecord, "created_at"> & { created_at?: string }
): Promise<FileRecord> {
  // If destination folder is effectively private, ensure file is marked private
  let isPrivate = data.is_private || false;
  if (data.folder_id) {
    const folderIsPrivate = await isFolderEffectivelyPrivate(data.folder_id);
    if (folderIsPrivate) {
      isPrivate = true;
    }
  }

  const newRecord: FileRecord = {
    ...data,
    is_private: isPrivate,
    folder_id: data.folder_id || null,
    created_at: data.created_at || new Date().toISOString(),
  };

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: inserted, error } = await supabase.from("files").insert(newRecord).select().single();
    if (error) {
      throw new Error(`Failed to save file metadata: ${error.message}`);
    }
    return inserted as FileRecord;
  }

  // Fallback to in-memory store
  mockFiles.unshift(newRecord);
  return newRecord;
}

/**
 * Updates a file's title, category, folder_id, or is_private.
 */
export async function updateFileRecord(
  id: string,
  updates: { title?: string; category?: string; folder_id?: string | null; is_private?: boolean }
): Promise<FileRecord | null> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("files")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update file: ${error.message}`);
    }
    return data as FileRecord;
  }

  // Fallback
  const index = mockFiles.findIndex((f) => f.id === id);
  if (index >= 0) {
    mockFiles[index] = {
      ...mockFiles[index],
      ...updates,
    };
    return mockFiles[index];
  }

  return null;
}

/**
 * Deletes a file record from Supabase.
 */
export async function deleteFileRecord(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from("files").delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete file from database: ${error.message}`);
    }
    return true;
  }

  // Fallback
  const initialLength = mockFiles.length;
  mockFiles = mockFiles.filter((f) => f.id !== id);
  return mockFiles.length < initialLength;
}
