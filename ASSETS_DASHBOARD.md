# Asset Dashboard Platform — Production Blueprint

Below is the production-ready full blueprint for the app.

---

## 1. What you are building

You are building a Digital Asset Management dashboard for images stored in Google Drive.

The app should allow users to:

**Search assets by:**

- month
- product
- casino
- size
- market
- language
- campaign
- status
- tags

**Users should be able to:**

- log in
- view image thumbnails
- search/filter assets
- open/download assets from Google Drive
- bulk tag assets
- see missing metadata
- sync new assets from Google Drive
- manage permissions by role

**The production setup should be:**

- **Google Drive** = image storage
- **Supabase Auth** = login / users / roles
- **Supabase Postgres** = asset metadata index
- **React (Vite) app** = dashboard UI
- **Backend API** (Node server, Supabase Edge Functions, or similar) = sync, Drive operations, and other server-only endpoints
- **Google Drive API** = scan, read files, thumbnails, links
- **Background job** = sync Drive into Supabase

Google Drive should not be your only database. Drive is excellent for storing files, but your dashboard needs a fast searchable index. Google Drive API can list/search files with `files.list`, and it supports query parameters and selected response fields, but your business filters are better stored in Supabase Postgres.

---

## 2. Final architecture

```
User
  ↓
React (Vite) Dashboard
  ↓
Supabase Auth
  ↓
Backend API (server)
  ↓
Supabase Postgres Metadata Index
  ↓
Google Drive API
  ↓
Google Drive Folders + Images
```

### Why this is the best structure

- **Google Drive** stores the actual files.

- **Supabase** stores searchable metadata:

  - casino
  - product
  - month
  - size
  - market
  - language
  - campaign
  - status
  - tags
  - drive_file_id
  - thumbnail_link
  - web_view_link

- **React (Vite)** delivers the SPA dashboard. **Backend API** (separate server process or Edge Functions) exposes GET, POST, PATCH, and DELETE endpoints so Google credentials and the Supabase service role stay off the client.

- **Supabase Auth** handles login, and **Supabase Row Level Security** protects database records by user/role. Supabase says RLS should be enabled on exposed schemas and is the recommended way to control granular authorization.

---

## 3. Main app modules

### A. Authentication module

Use Supabase Auth.

**Roles:**

- admin
- manager
- viewer

**Permissions:**

**admin:**

- sync Google Drive
- bulk edit metadata
- delete asset records
- manage users

**manager:**

- search assets
- bulk edit metadata
- approve/reject assets

**viewer:**

- search assets
- view/download assets

**Recommended tables:** `profiles`, `user_roles`

**Example:**

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now()
);

create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('admin', 'manager', 'viewer')),
  primary key (user_id, role)
);
```

Enable RLS on all public tables.

### B. Google Drive integration module

You need Google Drive API for:

- list folders
- list image files
- get file metadata
- get thumbnails
- get web view links
- download/open files
- detect updates

Google Drive `files.list` can list files and supports search with the `q` parameter. Google Drive file metadata includes fields like file ID, name, MIME type, parents, and thumbnails; Google documents `thumbnailLink` as the metadata field used to retrieve thumbnails when available.

For browser download links, Google documents `webContentLink` for blob files when the user has download access.

**You should store these fields:**

- drive_file_id
- drive_folder_id
- file_name
- mime_type
- thumbnail_link
- web_view_link
- web_content_link
- drive_created_at
- drive_modified_at

---

## 4. Google Drive authentication choice

You have two options.

### Option 1 — Service account

Best if the assets live in a company-owned Google Drive or Shared Drive.

You create a Google Cloud service account and give it access to the Drive folder or Shared Drive.

**Use this if:**

- one company Drive stores all assets
- users do not need to connect their own Google accounts
- the app manages one central asset library

For Google Workspace organizations, domain-wide delegation can authorize a service account to access Workspace users’ data on behalf of a user, but this requires Workspace admin setup and should be handled carefully.

### Option 2 — OAuth per user

Use this if every user connects their own Google Drive.

**Use this if:**

- each user has their own Drive assets
- users authorize the app individually
- you need per-user Drive access

### For your case — recommendation

**Service account + shared Google Drive folder**

That is cleaner for a production asset dashboard.

---

## 5. Folder structure recommendation

Use folders to help automatic indexing.

**Recommended Google Drive structure:**

```
/Assets
  /2026
    /04
      /Betano
        /Sportsbook
          /300x250
          /728x90
          /1080x1080
        /Casino
          /300x250
      /Superbet
        /Casino
          /300x250
    /05
      /Betano
        /Sportsbook
```

**Pattern:**

```
/Assets/{year}/{month}/{casino}/{product}/{size}/{file}
```

This lets the system automatically understand:

- year = 2026
- month = 04
- casino = Betano
- product = Sportsbook
- size = 300x250

This is how you avoid manually tagging 100k images one by one.

---

## 6. Database schema

Use Supabase Postgres.

### Main assets table

```sql
create table assets (
  id uuid primary key default gen_random_uuid(),

  drive_file_id text unique not null,
  drive_folder_id text,
  drive_parent_ids text[],

  file_name text not null,
  file_extension text,
  mime_type text,
  file_size_bytes bigint,

  thumbnail_link text,
  web_view_link text,
  web_content_link text,

  folder_path text,

  casino text,
  product text,
  campaign text,
  market text,
  language text,
  month text,
  year int,

  width int,
  height int,
  size_label text,

  asset_type text,
  status text default 'unreviewed',
  tags text[] default '{}',

  metadata_source text default 'auto',
  metadata_confidence numeric default 0,

  drive_created_at timestamptz,
  drive_modified_at timestamptz,
  indexed_at timestamptz default now(),
  updated_at timestamptz default now(),

  is_deleted boolean default false
);
```

### Metadata quality table

```sql
create table asset_metadata_issues (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id) on delete cascade,
  issue_type text not null,
  issue_message text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);
```

**Examples:**

- missing_casino
- missing_product
- missing_month
- missing_size
- folder_size_mismatch
- duplicate_file_name
- unknown_market

### Sync jobs table

```sql
create table drive_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  status text default 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  files_scanned int default 0,
  files_created int default 0,
  files_updated int default 0,
  files_failed int default 0,
  error_message text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

### Audit log table

```sql
create table asset_audit_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz default now()
);
```

This is important for production because users will bulk edit thousands of assets.

---

## 7. Indexes for fast search

For 100k+ assets, add indexes.

```sql
create index assets_casino_idx on assets (casino);
create index assets_product_idx on assets (product);
create index assets_month_idx on assets (month);
create index assets_size_label_idx on assets (size_label);
create index assets_status_idx on assets (status);
create index assets_drive_file_id_idx on assets (drive_file_id);
create index assets_folder_path_idx on assets (folder_path);
create index assets_tags_idx on assets using gin (tags);
```

**For combined dashboard filters:**

```sql
create index assets_filter_idx
on assets (casino, product, month, size_label, status);
```

**For filename search:**

```sql
create extension if not exists pg_trgm;

create index assets_file_name_trgm_idx
on assets using gin (file_name gin_trgm_ops);
```

---

## 8. Automatic indexing flow

The indexer is the system that reads Google Drive and saves records in Supabase.

### Step 1 — Scan folders

The app calls Google Drive API and starts from your root folder: `/Assets`

It recursively lists folders and image files.

**Only include image MIME types:**

- image/png
- image/jpeg
- image/webp
- image/gif
- image/svg+xml

### Step 2 — For each image, collect Drive metadata

Save:

- drive_file_id
- file_name
- mime_type
- parents
- thumbnail_link
- web_view_link
- web_content_link
- created_time
- modified_time
- size

Google Drive API allows `files.get` to fetch metadata, and with `alt=media`, file content can be downloaded for files stored in Drive.

### Step 3 — Build folder path

**Example:**

`/Assets/2026/04/Betano/Sportsbook/300x250/banner.png`

The indexer maps parent folder IDs to names and reconstructs the full folder path.

### Step 4 — Extract automatic metadata

**From folder path:**

`/Assets/2026/04/Betano/Sportsbook/300x250/`

Extract:

```json
{
  "year": 2026,
  "month": "2026-04",
  "casino": "Betano",
  "product": "Sportsbook",
  "size_label": "300x250"
}
```

**From file name:**

`betano_sportsbook_ro_300x250_april_banner_v1.png`

Extract:

```json
{
  "casino": "betano",
  "product": "sportsbook",
  "market": "RO",
  "size_label": "300x250"
}
```

**From image dimensions:**

- width = 300
- height = 250
- size_label = 300x250

### Step 5 — Save to Supabase

Use upsert by `drive_file_id`.

```sql
insert into assets (...)
values (...)
on conflict (drive_file_id)
do update set
  file_name = excluded.file_name,
  drive_modified_at = excluded.drive_modified_at,
  thumbnail_link = excluded.thumbnail_link,
  indexed_at = now();
```

### Step 6 — Detect missing metadata

After indexing, generate issues.

**Example rules:**

- if casino is null → missing_casino
- if product is null → missing_product
- if month is null → missing_month
- if width/height missing → missing_dimensions
- if folder size != actual image size → size_mismatch

### Step 7 — Show missing metadata in dashboard

Admin sees:

- 2,431 assets missing product
- 872 assets missing casino
- 119 assets have size mismatch
- 54 duplicate file names

Then they bulk fix groups.

---

## 9. Bulk tagging system

Bulk tagging is the production feature that saves you from editing 100k images manually.

### Bulk edit screen

**Filters:**

- folder
- casino
- product
- month
- size
- status
- missing metadata
- file name contains

**Actions:**

- set casino
- set product
- set campaign
- set month
- set market
- set language
- set status
- add tags
- remove tags
- mark approved
- mark archived

**Example:**

- **Filter:** folder_path contains `/Assets/2026/04/Betano/`
- **Select:** 2,000 assets
- **Apply:** casino = Betano, month = 2026-04

### Bulk operation table

For large updates, create a job table:

```sql
create table bulk_operations (
  id uuid primary key default gen_random_uuid(),
  status text default 'pending',
  filter jsonb,
  changes jsonb,
  affected_count int,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  finished_at timestamptz
);
```

This prevents timeouts when updating thousands of records.

---

## 10. Dashboard pages

### Page 1 — Login

Supabase Auth login.

**Options:**

- email/password
- magic link
- Google login
- SSO later if needed

### Page 2 — Asset Library

Main search page.

**Filters:**

Casino, Product, Month, Size, Market, Language, Campaign, Status, Tags, Folder

**Results grid:**

thumbnail, file name, casino, product, month, size, status, open in Drive, download

**Actions:**

- select assets
- bulk edit
- export results
- copy Drive links

### Page 3 — Asset Detail

Shows one asset.

**Fields:**

image preview, file name, Drive link, metadata, folder path, dimensions, created/modified date, audit history

**Actions:**

edit metadata, open in Drive, download, mark approved, archive

### Page 4 — Bulk Tagging

**Purpose:** fix missing metadata quickly

**Features:** filter assets, select all results, apply metadata, preview affected count, confirm update, write audit log

### Page 5 — Sync Center

Admin-only.

**Shows:** last sync time, files scanned, new files, updated files, failed files, deleted/missing files, sync errors

**Buttons:** Sync now, Re-index folder, Rebuild metadata, Detect duplicates

### Page 6 — Metadata Issues

Admin/manager page.

**Groups problems:** missing casino, missing product, missing month, unknown size, folder mismatch, duplicate files

### Page 7 — Settings

Admin page.

**Configure:** Google Drive root folder ID, folder parsing rules, allowed casinos, allowed products, allowed markets, allowed statuses, user roles

---

## 11. Sync strategy for production

You need two types of sync.

### A. Manual sync

Admin clicks: Sync Drive — good for MVP.

### B. Scheduled sync

Run every 15 minutes, hourly, or daily.

Supabase supports scheduled Edge Functions using pg_cron and pg_net, and Supabase recommends storing secrets securely using Vault for scheduled function calls.

**Recommended schedule:**

- Every 15 minutes during work hours
- Every 1 hour outside work hours
- Full reindex once per night

### C. Change-based sync

Google Drive supports push notifications for file and change resources, so your app can receive notifications when Drive changes instead of always scanning everything.

**Production approach:**

- **MVP:** manual sync
- **Production v1:** scheduled sync
- **Production v2:** Drive push notifications + scheduled backup sync

Keep scheduled sync even if you use push notifications, because webhooks can fail.

---

## 12. Handling 100k images

For 100k images, do not load all records at once.

**Use:**

- pagination
- server-side filtering
- database indexes
- background jobs
- batch inserts
- batch updates
- thumbnail caching

**Recommended pagination:** 50–100 assets per page

Use **cursor pagination** for large datasets.

**Example API:**

`GET /api/assets?casino=Betano&month=2026-04&size=300x250&page=1`

**Do not call Google Drive every time the user searches.**

**Correct flow:** Search Supabase → show results → use stored Drive links/thumbnails

**Wrong flow:** User searches → app searches Google Drive live every time

Google Drive API is a shared service with quotas and limitations, so production apps should avoid unnecessary API calls and use backoff/retry behavior for quota errors.

---

## 13. Metadata rules

Create a config table for valid values.

```sql
create table metadata_options (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  value text not null,
  label text,
  active boolean default true,
  created_at timestamptz default now(),
  unique(type, value)
);
```

**Examples:**

- type = casino, value = Betano
- type = casino, value = Superbet
- type = product, value = Sportsbook
- type = product, value = Casino
- type = market, value = RO
- type = market, value = UK

This prevents messy data like: Betano, betano, BETANO, Betano RO

Use controlled dropdowns in the dashboard.

---

## 14. Metadata extraction rules

Create a parser config.

**Example folder parser:**

```json
{
  "pattern": "/Assets/{year}/{month}/{casino}/{product}/{size}",
  "month_format": "MM",
  "size_format": "{width}x{height}"
}
```

**Example filename parser:**

```json
{
  "patterns": [
    "{casino}_{product}_{market}_{size}_{month}_{type}",
    "{casino}-{product}-{size}-{language}"
  ]
}
```

**Priority order:**

1. Manual metadata from dashboard
2. Folder path metadata
3. Filename metadata
4. Image dimensions
5. Drive created/modified date

Manual edits should not be overwritten by future syncs unless admin chooses “rebuild metadata.”

---

## 15. Image dimensions

You need dimensions for size filters.

**Options:**

- read image dimensions during indexing
- infer from folder name
- infer from filename

**Best approach:**

- Use actual image dimensions as source of truth.
- Use folder/filename size as expected size.
- Flag mismatch if different.

**Example:**

- Folder says 300x250
- Image is actually 320x250
- **Issue:** size_mismatch

---

## 16. Security requirements

### Never expose Google credentials in the browser

Google Drive credentials must stay server-side.

- **Correct:** Browser → your API → Google Drive API
- **Wrong:** Browser → Google Drive API using secret key

### Use Supabase RLS

Enable RLS on:

- assets
- profiles
- user_roles
- bulk_operations
- audit_logs
- sync_jobs

Supabase’s RLS model is designed for granular authorization, especially when data is accessed from the browser.

### Use server-side service role carefully

Use Supabase service role only on the server.

**Never expose:**

- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_CLIENT_SECRET
- GOOGLE_SERVICE_ACCOUNT_KEY

### Add audit logs

Every bulk edit should save: who changed it, what changed, old value, new value, when

---

## 17. Environment variables

You will need:

Use `VITE_`-prefixed variables only for values that are safe to embed in the Vite client bundle (Supabase URL and anon key). Keep secrets server-only.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_PROJECT_ID=

GOOGLE_DRIVE_ROOT_FOLDER_ID=

APP_URL=
SYNC_SECRET=
```

If using OAuth instead of service account:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

---

## 18. API routes

**Recommended backend API routes** (implement on your Node server, Supabase Edge Functions, or another BFF—not in the Vite bundle):

| Method | Path |
|--------|------|
| GET | /api/assets |
| GET | /api/assets/:id |
| PATCH | /api/assets/:id |
| POST | /api/assets/bulk-update |
| POST | /api/sync/drive |
| GET | /api/sync/jobs |
| GET | /api/sync/jobs/:id |
| GET | /api/metadata/options |
| POST | /api/metadata/options |
| GET | /api/drive/folders |
| POST | /api/drive/reindex-folder |

**Example search request:**

`GET /api/assets?casino=Betano&product=Sportsbook&month=2026-04&size=300x250`

**Example bulk update request:**

```json
{
  "filter": {
    "folder_path_contains": "/Assets/2026/04/Betano/",
    "status": "unreviewed"
  },
  "changes": {
    "casino": "Betano",
    "month": "2026-04",
    "status": "approved"
  }
}
```

---

## 19. Search behavior

Dashboard should support:

- exact filters
- partial filename search
- tag search
- missing metadata filters
- date filters
- folder filters

**Examples:**

- casino = Betano
- product = Sportsbook
- month = 2026-04
- size = 300x250
- status = approved
- tags contains "homepage"
- file_name contains "bonus"

Use Supabase/Postgres for search, not live Drive search.

---

## 20. Thumbnail strategy

Use Google Drive thumbnail links for fast previews.

**But note:**

- Drive thumbnail URLs may be temporary
- permissions matter
- some files may not have thumbnails immediately

Google documents that `thumbnailLink` is part of file metadata and can return a short-lived thumbnail URL when available.

**Production strategy:**

- Store thumbnail_link during sync
- Refresh thumbnail_link when stale
- Show fallback icon if missing
- Optional later: cache thumbnails in Supabase Storage or CDN

For a real high-performance product, eventually cache generated thumbnails outside Drive, but for MVP you can use Drive thumbnails.

---

## 21. Important production warning

**Google Drive is not a CDN.**

- For internal tools, Drive previews are okay.
- For a high-traffic public-facing platform, you should not serve all image traffic directly from Google Drive.

**Production internal dashboard:** Google Drive thumbnails are acceptable

**Public asset delivery platform:** Use Cloudflare R2 / S3 / Supabase Storage / CDN for delivery

Since the app sounds like an internal dashboard, Google Drive is fine as storage.

---

## 22. Deployment recommendation

**Recommended production stack:**

| Layer | Choice |
|-------|--------|
| Frontend/backend | Vercel or Render |
| Database/auth | Supabase Pro project |
| Storage | Google Drive / Shared Drive |
| Background jobs | Supabase Edge Functions or Vercel Cron |
| Monitoring | Sentry |
| Logs | Axiom / Logtail / Supabase logs |

**For scheduled sync, use:**

- Supabase scheduled Edge Functions
- or Vercel Cron
- or GitHub Actions cron

Supabase scheduled Edge Functions are supported via pg_cron and pg_net.

---

## 23. MVP version

Build this first.

### MVP features

1. Supabase login
2. Connect one Google Drive root folder
3. Manual Drive sync button
4. Assets table in Supabase
5. Auto metadata from folder path
6. Auto width/height extraction
7. Search page with filters
8. Bulk edit metadata
9. Missing metadata page
10. Open asset in Google Drive

### Do not start with:

- AI tagging
- complex approval workflows
- multiple Drive accounts
- real-time sync
- custom CDN
- advanced analytics

Build simple, correct, and scalable.

---

## 24. Production version

After MVP works, add:

- scheduled sync
- Drive push notifications
- audit logs
- roles and permissions
- duplicate detection
- metadata validation
- CSV export
- advanced search
- thumbnail caching
- activity history
- approval workflow

---

## 25. Recommended build order

### Phase 1 — Foundation

- Create Supabase project
- Set up Auth
- Create database tables
- Enable RLS
- Create React (Vite) app
- Add protected dashboard layout

### Phase 2 — Google Drive sync

- Create Google Cloud project
- Enable Google Drive API
- Create service account
- Share Drive root folder with service account
- Build folder scanner
- Save files into Supabase

### Phase 3 — Metadata extraction

- Parse folder path
- Parse filename
- Detect image dimensions
- Save metadata confidence
- Generate missing metadata issues

### Phase 4 — Dashboard

- Asset grid
- Filters
- Asset detail page
- Open/download links
- Pagination

### Phase 5 — Bulk tagging

- Select assets
- Apply metadata to many assets
- Save audit logs
- Show affected count before applying

### Phase 6 — Production hardening

- Scheduled sync
- Retry failed jobs
- Rate limit API routes
- Add monitoring
- Add role-based access
- Add backup/export

---

## 26. What you should ask a developer to build

Here is the exact brief you can give to a developer:

Build a production-ready digital asset dashboard using React (Vite), Supabase, and Google Drive API.

Google Drive will store all image files. Supabase will handle authentication and store a searchable metadata index for every Drive image. The app must scan a configured Google Drive root folder, recursively index image files, extract metadata from folder paths, filenames, and image dimensions, then save the results into Supabase.

Users must log in with Supabase Auth. The app must support roles: admin, manager, and viewer. Admins can sync Google Drive, bulk edit metadata, configure metadata options, and manage users. Managers can search, view, and bulk edit metadata. Viewers can only search and view/download assets.

The dashboard must include:

1. Asset search page with filters for casino, product, month, size, market, language, campaign, status, tags, and filename.
2. Asset grid with thumbnails, file name, metadata, and links to open/download from Google Drive.
3. Asset detail page with preview, Drive links, metadata editing, dimensions, folder path, and audit history.
4. Sync Center page showing sync status, files scanned, files created, files updated, failures, and last sync time.
5. Bulk Tagging page where users can filter/select many assets and apply metadata changes to all selected records.
6. Missing Metadata page showing assets with missing casino, product, month, size, or other required fields.
7. Settings page to configure the Drive root folder, folder parsing rules, allowed casinos, products, markets, statuses, and user roles.

The system must not query Google Drive every time the user searches. Searches must run against Supabase Postgres. Google Drive API should be used for syncing files, reading metadata, thumbnails, and Drive links.

**The indexer must:**

- Recursively scan the configured Google Drive root folder.
- Include image MIME types only.
- Store drive_file_id, file_name, folder_path, thumbnail_link, web_view_link, web_content_link, mime_type, created time, modified time, and file size.
- Extract year, month, casino, product, and size from folder paths.
- Extract market, product, size, and other tags from filenames when possible.
- Detect actual image width and height.
- Save or update records using drive_file_id as the unique key.
- Generate metadata issue records for missing or inconsistent metadata.
- Support manual sync first, then scheduled sync later.

**The database must include:**

- assets
- profiles
- user_roles
- drive_sync_jobs
- asset_metadata_issues
- asset_audit_logs
- metadata_options
- bulk_operations

All Supabase tables must have RLS enabled. Google Drive credentials and Supabase service role keys must only be used server-side. The browser must never receive private Google credentials.

Deploy the Vite build to static hosting (for example Vercel, Netlify, or Render static sites) and run the backend API on a platform that supports long-running or scheduled jobs, with Supabase as the hosted database/auth provider. Background sync can use Supabase Edge Functions, a host cron, or another scheduled job system.

---

## 27. Best final answer

For your real production app, use this:

- React (Vite)
- Supabase Auth
- Supabase Postgres
- Google Drive API
- Google Drive Shared Folder
- Background sync job
- Bulk tagging dashboard

**Do not manually create metadata for 100k images.**

**Do this instead:**

1. Organize Drive folders with a predictable structure.
2. Scan Google Drive automatically.
3. Extract metadata from folder paths, filenames, and image dimensions.
4. Save metadata in Supabase.
5. Show missing metadata in the dashboard.
6. Bulk tag groups of assets.
7. Search Supabase, not Google Drive, when users use the dashboard.

This is the cleanest production-ready architecture for your idea.
