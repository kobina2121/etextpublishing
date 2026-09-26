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
- [ ] Logo artwork — the book icon is a stand-in
- [ ] Hero photography — the hero falls back to a tonal placeholder until real licensed images are supplied
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
- [x] Cormorant Garamond for display headings, Montserrat for body and UI
- [x] Brand red primary, square corners, full-bleed hero treatment
- [x] `@tailwindcss/typography` wired to theme tokens for article bodies
- [x] 26 shadcn primitives
- [x] Layout primitives: `Container`, `Section`, `PageHeader`
- [x] Theme provider, `ModeToggle`, `TooltipProvider`, `Toaster`
- [x] Motion wrappers honouring `prefers-reduced-motion`: `FadeIn`, `Stagger`, `PageTransition`
- [x] `/kitchen-sink` reference page, 404 in production

**Exit:** every primitive renders in both themes at 375px and desktop. ✅

## Phase 3 — Public website ✅

- [x] Navbar (route-aware overlay) + mobile Sheet nav, Footer
- [x] Home, About, Publications listing + detail, Authors listing + detail
- [x] Services, News listing + Article detail, Contact, Manuscript submission
- [x] `loading.tsx` per listing, `error.tsx`, `not-found.tsx`, empty states
- [x] Search / filter / pagination driven by URL `searchParams`
- [x] Typed fixtures behind an async query layer, so Phase 4 swaps the bodies
      for Mongoose without touching a page
- [x] Shared Zod schemas for the contact and manuscript forms

**Exit:** all routes render with correct HTTP status; 375px → 1280px verified. ✅

### Carried into later phases

- Form submit handlers are stubs: validation and UX are complete, transport
  lands in Phase 7 with uploads and email.
- Detail routes set `dynamicParams = false` so unknown slugs and drafts return a
  real 404. Phase 4 must trigger a rebuild or revalidation when an admin
  publishes, or newly published titles will 404 until the next deploy.

## Phase 4 — Database ✅

- [x] Models: User, Publication, Author, Category, Article, Service, ManuscriptSubmission, ContactMessage, SiteSettings
- [x] Unique slug indexes, plus `status + publicationDate`, `status + featured`,
      `status + order` and submission/message compound indexes
- [x] Idempotent seed script: admin from env, content upserted by slug,
      `--reset` clears content but never accounts
- [x] Query layer swapped to Mongoose with no change to any page or component

**Exit:** seed runs clean and is idempotent; public pages render from MongoDB. ✅

### Notes

- Search uses `$lookup` + escaped `$regex` rather than a Mongo text index: a
  text index is single-collection and cannot cover the author's name, which
  Phase 3 search already matched. Move to Atlas Search or a denormalised
  `authorName` if the catalogue outgrows a regex scan.
- `next build` requires a reachable database and exits 1 if it is not — verified.
  A reachable but empty database builds an empty site, which is correct for a
  fresh install.
- Still outstanding from Phase 3: publishing new content needs a rebuild or
  revalidation, because detail routes set `dynamicParams = false`.

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
