# CloudVault — Architecture & Database Schema

## Overview

CloudVault is a full-stack Google Drive clone built with React, TypeScript, and Lovable Cloud (Supabase). It uses **Bunny.net Storage** for file hosting and **Bunny.net Stream** for video transcoding and delivery.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────────┐ │
│  │ AuthPage  │  │ DrivePage │  │ Components           │ │
│  │ (Login/   │  │ (Main UI) │  │ - DriveSidebar       │ │
│  │  Signup)  │  │           │  │ - FileGrid           │ │
│  └───────────┘  └─────┬─────┘  │ - FilePreview        │ │
│                       │        │ - RenameDialog        │ │
│                       │        │ - NewFolderDialog     │ │
│                       │        │ - UploadProgressBar   │ │
│                       │        └──────────────────────┘ │
│  ┌────────────────────┴────────────────────────────────┐│
│  │              Hooks                                   ││
│  │  useAuth.tsx  — Session & auth management            ││
│  │  useFiles.tsx — CRUD, uploads, stats, sharing        ││
│  └──────────────────────┬──────────────────────────────┘│
└─────────────────────────┼───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
  ┌──────────────┐ ┌────────────┐ ┌──────────────┐
  │  Supabase    │ │  Edge Fn:  │ │  Edge Fn:    │
  │  Auth + DB   │ │  bunny-    │ │  bunny-      │
  │  (Postgres)  │ │  storage   │ │  stream      │
  └──────┬───────┘ └─────┬──────┘ └──────┬───────┘
         │               │               │
         │               ▼               ▼
         │        ┌─────────────┐ ┌─────────────┐
         │        │ Bunny.net   │ │ Bunny.net   │
         │        │ Storage     │ │ Stream      │
         │        │ (CDN files) │ │ (Videos)    │
         │        └─────────────┘ └─────────────┘
         │
         ▼
  ┌──────────────┐
  │  files table  │
  │  (metadata)   │
  └──────────────┘
```

---

## Database Schema

### Table: `public.files`

| Column           | Type                     | Nullable | Default              | Description                                      |
|------------------|--------------------------|----------|----------------------|--------------------------------------------------|
| `id`             | `uuid`                   | No       | `gen_random_uuid()`  | Primary key                                      |
| `user_id`        | `uuid`                   | No       | —                    | Owner (references `auth.users`)                  |
| `name`           | `text`                   | No       | —                    | File or folder display name                      |
| `type`           | `text`                   | No       | `'file'`             | `'file'` or `'folder'`                           |
| `mime_type`      | `text`                   | Yes      | —                    | MIME type (e.g. `image/png`, `video/mp4`)         |
| `size`           | `bigint`                 | Yes      | `0`                  | File size in bytes                               |
| `parent_id`      | `uuid`                   | Yes      | —                    | Parent folder ID (self-referencing FK)            |
| `storage_path`   | `text`                   | Yes      | —                    | `bunny-storage://...` or `bunny-stream://...`     |
| `bunny_cdn_url`  | `text`                   | Yes      | —                    | Public CDN URL for direct access                  |
| `bunny_video_id` | `text`                   | Yes      | —                    | Bunny Stream video GUID (for videos only)         |
| `is_starred`     | `boolean`                | Yes      | `false`              | User starred this item                           |
| `is_trashed`     | `boolean`                | Yes      | `false`              | Soft-delete flag                                 |
| `shared`         | `boolean`                | Yes      | `false`              | Whether publicly shared                          |
| `created_at`     | `timestamptz`            | No       | `now()`              | Creation timestamp                               |
| `updated_at`     | `timestamptz`            | No       | `now()`              | Last modification timestamp                      |

### Foreign Keys

| Column      | References                |
|-------------|---------------------------|
| `parent_id` | `public.files(id)`        |

### Row Level Security (RLS)

All policies are **restrictive** (user can only access their own data):

| Policy                              | Command  | Expression                    |
|-------------------------------------|----------|-------------------------------|
| Users can view their own files      | SELECT   | `auth.uid() = user_id`        |
| Users can insert their own files    | INSERT   | `auth.uid() = user_id`        |
| Users can update their own files    | UPDATE   | `auth.uid() = user_id`        |
| Users can delete their own files    | DELETE   | `auth.uid() = user_id`        |

---

## Edge Functions

### `bunny-storage`

Proxies requests to the Bunny.net Storage API.

| Action     | Method | Description                          |
|------------|--------|--------------------------------------|
| `upload`   | POST   | Upload file via FormData             |
| `delete`   | POST   | Delete file by storage path          |
| `list`     | GET    | List files in a storage directory    |

### `bunny-stream`

Proxies requests to the Bunny.net Stream API.

| Action          | Method | Description                                    |
|-----------------|--------|------------------------------------------------|
| `create-video`  | POST   | Create video placeholder, returns upload creds  |
| `upload-video`  | PUT    | Upload video binary (used as fallback)          |
| `delete-video`  | POST   | Delete video by ID                             |
| `get-video`     | GET    | Get video metadata + embed URL                  |
| `list-videos`   | GET    | List all videos in the library                  |

---

## Required Secrets

| Secret Name              | Description                                    |
|--------------------------|------------------------------------------------|
| `BUNNY_STORAGE_ZONE`     | Bunny.net storage zone name                    |
| `BUNNY_STORAGE_HOST`     | Bunny.net storage hostname                     |
| `BUNNY_STORAGE_PASSWORD` | Bunny.net storage API password                 |
| `BUNNY_STREAM_LIBRARY_ID`| Bunny.net stream library ID                    |
| `BUNNY_STREAM_API_KEY`   | Bunny.net stream API key                       |
