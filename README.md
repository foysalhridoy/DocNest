# DocNest 🪺

> Modern, student-friendly academic document & lecture slide library inspired by [OurDIU](https://ourdiu.com). Anyone can browse, search, preview, and download course documents (PDF and PPTX), while verified administrators can manage, upload, rename, and delete resources with Dual-Drive Google Drive storage and Supabase metadata.

---

## 🚀 Features

- **Public Resource Portal**:
  - Clean card-grid list of academic documents and slides.
  - Live search by title, course code, or topic (press `/` key to quick search).
  - Format filters (**All**, **PDF**, **PPTX**) and academic category chips.
  - Sorting by Newest, Oldest, Name (A-Z), and File Size.
  - Copyable share links with instant clipboard feedback.
- **Interactive File Viewer (`/file/[id]`)**:
  - Embedded Google Drive preview iframe (`https://drive.google.com/file/d/{id}/preview`) with seamless PDF & PowerPoint rendering.
  - Action bar with direct download, share link, and Drive links.
- **Dual-Drive Cloud Storage (Google Drive API)**:
  - Supports **Drive 1** (Primary) and **Drive 2** (Secondary) with independent Google Service Accounts.
  - Automatic quota detection via `drive.about.get`: when Drive 1 reaches **90% capacity**, uploads automatically roll over to Drive 2.
  - Resumable direct upload architecture bypassing Vercel serverless 4.5MB request body limits for large PPTX presentations.
  - Files are automatically granted public view permissions upon upload (`anyone with the link can view`).
- **Server-Side Secured Admin Dashboard (`/admin`)**:
  - Protected by Next.js Edge Middleware verifying signed HTTP-only JWT cookies (7-day expiration).
  - Sliding-window rate limiting on login attempts to thwart brute force attacks.
  - Live visual storage meters showing real-time used bytes, percentage, and active drive target.
  - Drag-and-drop upload zone with live progress indicators.
  - File management table with inline search, rename modal, and delete confirmation modal (removes from both Google Drive and Supabase).
- **Aesthetics & UI**:
  - Modern pastel color accents, rounded pill badges, and Inter typography inspired by OurDIU.
  - System-aware Dark and Light mode toggle with persistent preference and zero-flash bootstrap script.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router) + TypeScript
- **Styling**: Tailwind CSS + `lucide-react` icons
- **Storage Fleet**: Google Drive API v3 via `googleapis`
- **Metadata Database**: [Supabase](https://supabase.com) (PostgreSQL Free Tier)
- **Authentication**: Signed HTTP-only JWT session cookies via `jose`
- **Deployment**: Deployable on [Vercel](https://vercel.com)

---

## 📋 Step-by-Step Setup Guide

### 1. Google Cloud Project & Drive API

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `docnest-storage`).
3. In the search bar, search for **Google Drive API** and click **Enable**.

---

### 2. Create Service Accounts for Dual-Drive

You will configure **two separate service accounts** (one for Drive 1 and one for Drive 2):

#### Service Account 1 (Drive 1):
1. Navigate to **IAM & Admin** -> **Service Accounts**.
2. Click **Create Service Account**:
   - **Name**: `docnest-sa-1`
   - **ID**: `docnest-sa-1`
3. Click **Done** (no project roles needed).
4. Click on the created service account (`docnest-sa-1@...`).
5. Open the **Keys** tab -> **Add Key** -> **Create new key** -> Choose **JSON** -> Click **Create**.
6. Save the downloaded JSON file. You will need:
   - `client_email` -> `GOOGLE_SA_1_EMAIL`
   - `private_key` -> `GOOGLE_SA_1_PRIVATE_KEY`

#### Service Account 2 (Drive 2):
1. Repeat the steps above to create `docnest-sa-2`:
   - Name: `docnest-sa-2`
   - Key: Download JSON key -> `GOOGLE_SA_2_EMAIL`, `GOOGLE_SA_2_PRIVATE_KEY`.

---

### 3. Setup Google Drive Folders & Permissions

1. Open your Google Drive account.
2. Create a folder for Drive 1 (e.g., `DocNest Storage 1`).
   - Right-click folder -> **Share** -> Add `docnest-sa-1@your-project.iam.gserviceaccount.com` as **Editor**.
   - Copy the folder ID from the URL (`drive.google.com/drive/folders/{FOLDER_ID}`) -> `GOOGLE_FOLDER_1_ID`.
3. Create a folder for Drive 2 (e.g., `DocNest Storage 2`).
   - Right-click folder -> **Share** -> Add `docnest-sa-2@your-project.iam.gserviceaccount.com` as **Editor**.
   - Copy the folder ID from the URL -> `GOOGLE_FOLDER_2_ID`.

---

### 4. Supabase Database Setup

1. Create a free project at [Supabase](https://database.new).
2. Go to the **SQL Editor** in your Supabase dashboard and run the following script:

```sql
-- 1. Create the files table
CREATE TABLE IF NOT EXISTS public.files (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  drive_slot SMALLINT NOT NULL CHECK (drive_slot IN (1, 2)),
  drive_file_id TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create indexes for high-speed search and filtering
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files (category);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON public.files (mime_type);
CREATE INDEX IF NOT EXISTS idx_files_title_search ON public.files USING gin (to_tsvector('english', title));

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- 4. Public users have read-only access
CREATE POLICY "Public users can read file catalog"
  ON public.files
  FOR SELECT
  USING (true);

-- 5. Service role can perform all mutations
CREATE POLICY "Service role full access"
  ON public.files
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

3. Navigate to **Project Settings** -> **API**:
   - Copy **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key -> `SUPABASE_SERVICE_ROLE_KEY`

---

### 5. Environment Variables

Create a `.env.local` file in the root directory (based on `.env.example`):

```bash
# Admin Authentication
ADMIN_PASSWORD="YourSecurePasswordHere"
SESSION_SECRET="generate_a_random_32_character_secret_string"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Google Drive 1 (Primary)
GOOGLE_SA_1_EMAIL="docnest-sa-1@your-project.iam.gserviceaccount.com"
GOOGLE_SA_1_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_FOLDER_1_ID="1your_folder_1_id"

# Google Drive 2 (Secondary Fallback at 90%)
GOOGLE_SA_2_EMAIL="docnest-sa-2@your-project.iam.gserviceaccount.com"
GOOGLE_SA_2_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_FOLDER_2_ID="1your_folder_2_id"
```

> **Note**: Even if you haven't filled in your Google Drive or Supabase credentials yet, DocNest includes a graceful **demonstration mode** with mock academic documents so you can immediately explore the UI and test features!

---

### 6. Local Development

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- Public Library: `http://localhost:3000/`
- Document Viewer: `http://localhost:3000/file/{id}`
- Admin Login: `http://localhost:3000/admin/login`
- Admin Dashboard: `http://localhost:3000/admin`

---

### 7. Deploying to Vercel

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel](https://vercel.com/new) and import the repository.
3. In the **Environment Variables** section, add all variables defined in your `.env.local`:
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SA_1_EMAIL`, `GOOGLE_SA_1_PRIVATE_KEY`, `GOOGLE_FOLDER_1_ID`
   - `GOOGLE_SA_2_EMAIL`, `GOOGLE_SA_2_PRIVATE_KEY`, `GOOGLE_FOLDER_2_ID`
4. Click **Deploy**. Vercel will build and deploy DocNest in seconds.

---

## 🔒 Security Architecture

- **Server-Side Enforcement**: All upload (`/api/admin/upload/*`), update (`PATCH /api/admin/files/*`), and delete (`DELETE /api/admin/files/*`) endpoints verify the admin session on the server. UI buttons are never the sole protection.
- **Edge Middleware Protection**: Requests to `/admin` are intercepted by Next.js Middleware and redirected to `/admin/login` if the signed session cookie is missing or invalid.
- **Rate Limiting**: Sliding-window rate limiter prevents credential guessing by temporarily locking out IPs after multiple consecutive failures.
- **File Validation**: Files are strictly validated by both extension (`.pdf`, `.pptx`) and MIME type, with sanitized titles preventing path traversal attacks.
- **Direct Drive Resumable Upload**: Bypasses Vercel's 4.5MB serverless body size limitation, allowing large PowerPoint presentations to stream directly into Google Drive while tracking upload progress.

---

## 📄 License

MIT License. Designed with ❤️ for university students and educators.
