-- ==============================================================================
-- FileNest / DocNest: Private Folder & File Isolation Migration
-- ==============================================================================

-- 1. Ensure the public.folders table exists
CREATE TABLE IF NOT EXISTS public.folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES public.folders(id) ON DELETE CASCADE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add is_private column to folders table (if not exists)
ALTER TABLE public.folders 
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- 3. Add is_private and folder_id columns to files table (if not exists)
ALTER TABLE public.files 
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.files 
  ADD COLUMN IF NOT EXISTS folder_id TEXT REFERENCES public.folders(id) ON DELETE SET NULL;

-- 4. High-performance indexes for privacy checks, parent-chain traversals, and folder listings
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders (parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_is_private ON public.folders (is_private);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files (folder_id);
CREATE INDEX IF NOT EXISTS idx_files_is_private ON public.files (is_private);

-- 5. Row Level Security (RLS) configuration
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Policy: Public users can only read folders that are public
DROP POLICY IF EXISTS "Public users can read public folders" ON public.folders;
CREATE POLICY "Public users can read public folders"
  ON public.folders
  FOR SELECT
  USING (is_private = false);

-- Policy: Public users can only read files that are public
DROP POLICY IF EXISTS "Public users can read file catalog" ON public.files;
CREATE POLICY "Public users can read file catalog"
  ON public.files
  FOR SELECT
  USING (is_private = false);

-- Policy: Service role full access for folders
DROP POLICY IF EXISTS "Service role full access folders" ON public.folders;
CREATE POLICY "Service role full access folders"
  ON public.folders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Service role full access for files
DROP POLICY IF EXISTS "Service role full access" ON public.files;
CREATE POLICY "Service role full access"
  ON public.files
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

