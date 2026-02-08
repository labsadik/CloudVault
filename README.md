# CloudVault

A full-stack cloud storage application inspired by Google Drive. Upload, preview, organize, share, and stream files and videos — all from a modern, responsive dark-themed UI.

---

## Features

- **File Management** — Upload, rename, delete, star, and organize files into folders
- **Video Streaming** — Videos are transcoded and delivered via Bunny.net Stream with embedded player
- **File Preview** — In-app preview for images, videos, audio, and PDFs
- **Drag & Drop Upload** — Drop files anywhere on the page to upload
- **Real-time Progress** — XHR-powered upload progress bars with status indicators
- **Search** — Instant client-side file search
- **Views** — My Drive, Recent, Starred, Shared, and Trash
- **Public Sharing** — Generate and copy public CDN links for any file
- **Storage Stats** — Sidebar shows total files, folders, videos, images, and storage usage
- **Responsive** — Works on desktop, tablet, and mobile
- **Authentication** — Email/password signup and login

---

## Tech Stack

| Layer        | Technology                                |
|--------------|-------------------------------------------|
| Frontend     | React 18, TypeScript, Vite                |
| UI           | Tailwind CSS, shadcn/ui, Lucide Icons     |
| Backend      | Lovable Cloud (Supabase — Auth, Database) |
| File Storage | Bunny.net Storage (CDN-backed)            |
| Video        | Bunny.net Stream (transcoding + delivery) |
| Edge Funcs   | Deno (Supabase Edge Functions)            |

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── drive/
│   │   │   ├── DriveSidebar.tsx      # Navigation + storage stats
│   │   │   ├── FileGrid.tsx          # Grid/list view of files
│   │   │   ├── FilePreview.tsx       # Preview dialog (images, video, PDF)
│   │   │   ├── NewFolderDialog.tsx   # Create folder dialog
│   │   │   ├── RenameDialog.tsx      # Rename file/folder dialog
│   │   │   └── UploadProgressBar.tsx # Floating upload progress panel
│   │   └── ui/                       # shadcn/ui components
│   ├── hooks/
│   │   ├── useAuth.tsx               # Auth context & session management
│   │   └── useFiles.tsx              # File CRUD, uploads, sharing, stats
│   ├── pages/
│   │   ├── Index.tsx                 # Auth gate (login or drive)
│   │   ├── AuthPage.tsx              # Login / Signup form
│   │   ├── DrivePage.tsx             # Main drive interface
│   │   └── NotFound.tsx              # 404 page
│   └── integrations/supabase/        # Auto-generated client & types
├── supabase/
│   ├── functions/
│   │   ├── bunny-storage/index.ts    # Bunny Storage proxy
│   │   └── bunny-stream/index.ts     # Bunny Stream proxy
│   ├── migrations/                   # Database migrations
│   └── config.toml                   # Edge function config
├── SCHEMA.md                         # Database schema documentation
└── README.md                         # This file
```

---

## Setup Guide

### Prerequisites

- Node.js 18+ and npm (or [bun](https://bun.sh))
- A [Bunny.net](https://bunny.net) account with:
  - A **Storage Zone** created
  - A **Stream Library** created

### 1. Clone & Install

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
```

### 2. Configure Lovable Cloud

This project uses **Lovable Cloud** for authentication, database, and edge functions. If you're running via [Lovable](https://lovable.dev), this is already configured.

The `.env` file is auto-generated with:
```
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

> ⚠️ Do **not** edit `.env` manually — it's managed by Lovable Cloud.

### 3. Add Bunny.net Secrets

In Lovable, go to your project and add the following secrets (they're stored securely and available to edge functions):

| Secret                   | Where to find it                                          |
|--------------------------|-----------------------------------------------------------|
| `BUNNY_STORAGE_ZONE`     | Bunny Dashboard → Storage → Zone Name                     |
| `BUNNY_STORAGE_HOST`     | Bunny Dashboard → Storage → FTP & API Access → Hostname   |
| `BUNNY_STORAGE_PASSWORD` | Bunny Dashboard → Storage → FTP & API Access → Password   |
| `BUNNY_STREAM_LIBRARY_ID`| Bunny Dashboard → Stream → Library → API → Library ID     |
| `BUNNY_STREAM_API_KEY`   | Bunny Dashboard → Stream → Library → API → API Key        |

### 4. Database Setup

The database schema is created automatically via migrations when you connect Lovable Cloud. The `files` table stores metadata for all files and folders. See [SCHEMA.md](./SCHEMA.md) for full details.

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Deploy

In Lovable, click **Share → Publish** to deploy your app with a public URL.

To connect a custom domain: **Project → Settings → Domains → Connect Domain**.

---

## How It Works

### File Upload Flow

1. User selects or drops files
2. **Non-video files** → uploaded to Bunny Storage via edge function → CDN URL saved to DB
3. **Video files** → edge function creates a Bunny Stream placeholder → browser uploads directly to Bunny Stream API with progress tracking → embed URL saved to DB

### File Preview

- **Images**: Rendered via `<img>` tag with CDN URL
- **Videos**: Fetches embed URL from Bunny Stream API → renders in responsive `<iframe>`
- **Audio**: Native `<audio>` player
- **PDFs**: Inline `<iframe>` viewer
- **Others**: Download prompt

### Sharing

- Toggle sharing on a file to mark it as public
- Use "Copy link" from the file menu to copy the CDN URL to clipboard
- For videos, the embed URL is fetched and shared

### Deletion

- Files are soft-deleted (moved to trash)
- "Empty Trash" permanently deletes files from both the database and Bunny.net storage/stream

---
