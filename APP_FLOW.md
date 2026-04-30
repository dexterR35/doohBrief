# doohBrief app flow (diagrams)

**If you see** `No diagram type detected` **and the error text starts with `# doohBrief`**, the viewer is feeding the **entire Markdown file** into Mermaid. Use either:

- **Markdown preview** that renders **each** fenced ` ```mermaid ` block on its own, or  
- **Diagram-only files** (no headings): `diagrams/doohBrief/bootstrap.mmd`, `routes.mmd`, `auth-sequence.mmd`, `asset-dw-summary.mmd`

---

## 1. Bootstrap and shell

```mermaid
flowchart TB
  subgraph browser["Browser"]
    index["index.html + root"]
    main["main.jsx StrictMode"]
    app["App.jsx"]
  end
  index --> main --> app

  app --> auth["AuthProvider Supabase session"]
  app --> toast["ToastContainer"]

  auth --> shell["AppShell"]
  shell -->|loading| spin["Loading session"]
  shell -->|ready| router["RouterProvider router.jsx"]
```

---

## 2. Routing and protection (actual routes)

```mermaid
flowchart TD
  router["React Router"]

  router --> login["/login LoginPage"]
  router --> root["/ redirect to /briefs-dooh"]
  router --> catchall["wildcard redirect /login"]
  router --> protected["ProtectedLayout + RequireAuth"]

  protected --> list["/briefs-dooh BriefsDoohIndexPage"]
  protected --> detail["/briefs-dooh/:briefSlug BriefDoohDetailPage"]

  gate{"user in AuthContext?"}
  protected --> gate
  gate -->|no| redirect["Navigate /login + state.from"]
  gate -->|yes| layout["Outlet app-shell app-main"]
```

---

## 3. Auth sequence (Supabase)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as React AuthContext
  participant SB as Supabase Auth

  Note over FE: Mount AuthProvider
  FE->>SB: getUser()
  SB-->>FE: user or null
  FE->>SB: onAuthStateChange subscribe
  SB-->>FE: session updates setUser

  U->>FE: Open protected route
  alt No user
    FE->>U: Redirect to login
  end
  U->>FE: signInWithPassword LoginPage
  FE->>SB: signInWithPassword
  SB-->>FE: session
  FE-->>U: Navigate to briefs

  U->>FE: signOut
  FE->>SB: signOut
  SB-->>FE: cleared session
```

---

## 4. Where this differs from the asset dashboard blueprint

The **asset dashboard** (separate product, described in `ASSET_DASHBOARD_PLATFORM_BLUEPRINT.md`) would add: authenticated **API to data warehouse** for search, list, and detail. This **doohBrief** repo today is a **SPA + Supabase auth** and DOOH feature pages; feature data flows are in `src/features/dooh/` (local or Supabase per your modules), not the DW pattern in the blueprint unless you wire that later.

---

## 5. Asset dashboard: indexes, search and display (summary)

Full Mermaid (serving layer, search sequence, optional search engine) is in **`ASSET_DASHBOARD_PLATFORM_BLUEPRINT.md`** under **Diagrams: indexes, materialized views, and search**. Use that file in **Markdown preview** (fenced blocks), not a single-diagram tool on the whole file.

Condensed request path (also as `diagrams/doohBrief/asset-dw-summary.mmd`):

```mermaid
flowchart LR
  subgraph client["Browser"]
    SPA["Dashboard SPA<br/>q filters cursor"]
  end
  subgraph server["API"]
    API["Auth + RBAC"]
  end
  subgraph data["DW serving"]
    IX["Tables + indexes"]
    MV["Materialized views"]
  end
  SPA -->|paginated GET| API
  API -->|SQL LIMIT| IX
  API -->|or read| MV
  IX --> API
  MV --> API
  API -->|JSON pages| SPA
```

- **Search** means the server runs filtered, sorted SQL using **indexes**, often against an **MV** shaped for the UI.
- **Display** means the same API returns paged rows for the grid and **GET-by-id** for detail; the SPA does not load the full catalog.
