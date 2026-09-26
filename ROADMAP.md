# Roadmap — Publishing website & CMS

Build order and exit criteria. Tick items as they land.

## Stack

| Concern    | Choice                                                                         | Note                                                            |
| ---------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router), TypeScript strict                                     | `params`/`searchParams` are async                               |
| ODM        | Mongoose 9                                                                     | Idiomatic for MongoDB; no generate step in CI                   |
| Auth       | Auth.js v5 (`next-auth@beta`), Credentials + bcrypt, JWT sessions              | JWT is required: middleware runs on Edge, where Mongoose cannot |
| Mutations  | Server Actions; Route Handlers only for auth, upload presigning, file download |                                                                 |
| Files      | S3-compatible (R2 or AWS S3), presigned PUT                                    | Private manuscripts, public image prefix                        |
| Email      | Resend                                                                         | Needs API key + verified sending domain                         |
| UI         | Tailwind v4 + shadcn (Radix base, Nova preset) + motion                        |                                                                 |
| Validation | Zod 4, shared between client form and Server Action                            |                                                                 |
| Deploy     | Vercel + MongoDB Atlas                                                         |                                                                 |

## Outstanding inputs

- [ ] Real company information (name, tagline, contact, address, socials) — everything in `src/lib/site-config.ts` is a marked placeholder
- [ ] Brand colours / logo — the ink-blue + warm-paper palette is a neutral default
- [ ] S3 bucket + credentials (Phase 7)
- [ ] Resend API key, sending domain, recipient addresses (Phase 7)

---

## Phase 1 — Project setup ✅

- [x] Scaffold Next.js 16, TypeScript, Tailwind v4, ESLint, `src/`
- [x] shadcn init (Radix base, Nova preset)
- [x] Install the declared stack
- [x] Modular folder skeleton
- [x] `src/lib/env.ts` — lazily validated, memoised server env
- [x] `src/lib/db.ts` — `globalThis`-cached Mongoose connection
- [x] `src/lib/site-config.ts` — placeholder company info
- [x] tsconfig hardening, Prettier, `typecheck`/`lint`/`format`/`check` scripts
- [x] `.env.example` documenting every variable

**Exit:** `typecheck`, `lint`, `format:check`, `build` all clean. ✅

## Phase 2 — Design system ✅

- [x] Theme tokens in OKLCH for light and dark, plus motion tokens
- [x] Serif display face (Source Serif 4) for headings, Geist for body
- [x] `@tailwindcss/typography` wired to theme tokens for article bodies
- [x] 26 shadcn primitives
- [x] Layout primitives: `Container`, `Section`, `PageHeader`
- [x] Theme provider, `ModeToggle`, `TooltipProvider`, `Toaster`
- [x] Motion wrappers honouring `prefers-reduced-motion`: `FadeIn`, `Stagger`, `PageTransition`
- [x] `/kitchen-sink` reference page, 404 in production

**Exit:** every primitive renders in both themes at 375px and desktop. ✅

## Phase 3 — Public website

- [ ] Navbar + mobile Sheet nav, Footer
- [ ] Home, About, Publications listing + detail, Authors listing + detail
- [ ] Services, News listing + Article detail, Contact, Manuscript submission
- [ ] `loading.tsx`, `error.tsx`, `not-found.tsx`, empty states per listing
- [ ] Search / filter / pagination driven by URL `searchParams`
- [ ] Built against typed fixtures so layout is not blocked on the database

**Exit:** all routes render; 375px → 1440px verified; Lighthouse a11y ≥ 95.

## Phase 4 — Database

- [ ] Models: User, Publication, Author, Category, Article, Service, ManuscriptSubmission, ContactMessage, SiteSettings
- [ ] Unique slug indexes, `status + publicationDate`, `featured`, text index for search
- [ ] Seed script: admin user from env + placeholder content
- [ ] Replace Phase 3 fixtures with real queries

**Exit:** seed runs clean; public pages render from MongoDB.

## Phase 5 — Authentication

- [ ] Split Auth.js config: edge-safe `auth.config.ts` vs full `auth.ts`
- [ ] `middleware.ts` gating `/admin/*` by JWT role
- [ ] `requireAdmin()` re-checked inside every Server Action

**Exit:** logged-out `/admin/*` redirects; non-admin refused at both layers.

## Phase 6 — Admin dashboard

- [ ] Admin shell, dashboard counts, recent submissions/messages
- [ ] CRUD for publications, authors, categories, articles, services
- [ ] Manuscripts + messages: detail view with status workflow and notes
- [ ] Settings: tabbed form over the `SiteSettings` singleton, cached read invalidated on save
- [ ] Choose the categorical chart palette here, with the first dashboard tiles

**Exit:** every entity round-trips create → edit → publish → delete from the UI.

## Phase 7 — Uploads & email

- [ ] Presign route with server-side MIME + size validation
- [ ] Private manuscript prefix; admin download via short-lived presigned GET
- [ ] Submission and contact forms end-to-end, rate limited, honeypot
- [ ] Resend: submission receipt, staff notification, status-change notice

**Exit:** a manuscript uploads, is unreachable unsigned, downloads from admin, and both emails land.

## Phase 8 — SEO

- [ ] `generateMetadata` per route from `SiteSettings`
- [ ] Dynamic `sitemap.ts`, `robots.ts`, OG images via `next/og`, canonicals
- [ ] JSON-LD: Organization, Book, Person, Article, BreadcrumbList

**Exit:** Rich Results passes for a book, author, and article page.

## Phase 9 — Security

- [ ] Zod at every trust boundary; sanitise rendered article HTML
- [ ] Security headers + CSP; rate limits on public POSTs
- [ ] NoSQL-injection-safe queries; no secrets in client bundles

**Exit:** `/security-review` pass, then fixes.

## Phase 10 — Testing, optimisation, ship

- [ ] Vitest on Zod schemas and utils
- [ ] Playwright smoke: homepage, publication detail, search, submission, admin login, admin CRUD
- [ ] `typecheck` → `lint` → `build`, fix everything
- [ ] Manual pass over public + admin at 375 / 768 / 1440; Lighthouse
- [ ] Final commit and push

**Exit:** green gates, verified pages, shipped.
