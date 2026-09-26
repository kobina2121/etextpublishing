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

## Phase 5 — Authentication ✅

Admin login only: no public accounts, no signup, no user-facing auth.

- [x] Split Auth.js config: edge-safe `auth.config.ts` vs full `@/lib/auth`
- [x] `src/proxy.ts` gating `/admin/*` by JWT role
- [x] `requireAdmin()` guard, re-checked on the page and in every Server Action
- [x] `/admin/login` with shared Zod schema, generic errors, safe callbackUrl
- [x] Placeholder dashboard proving the gate; real screens are Phase 6

**Exit:** logged-out `/admin/*` redirects; tampered tokens refused; non-admin
roles rejected in `authorize()` as well as the proxy. ✅

### Next 16 gotchas worth remembering

- `middleware.ts` is deprecated and renamed to `proxy.ts`, exporting `proxy` or
  a default. Every Auth.js v5 guide still says `middleware`.
- With a `src/` directory the file must be `src/proxy.ts`. At the repo root it
  is silently ignored, and the admin area is left completely unprotected — the
  build output line `ƒ Proxy (Middleware)` is the check that it is registered.
- Session/User/JWT augmentation must target `@auth/core/types` and
  `@auth/core/jwt`; `next-auth` only re-exports them, so augmenting that module
  creates new, unrelated interfaces.

## Phase 6 — Admin dashboard ✅

- [x] Admin shell, dashboard counts, recent submissions/messages
- [x] CRUD for publications, authors, categories, articles, services
- [x] Manuscripts + messages: detail view with status workflow and notes
- [x] Settings: tabbed form over the `SiteSettings` singleton, upserted on save
- [x] Image upload from a device, behind a storage interface (MongoDB now,
      S3 in Phase 7)
- [ ] Categorical chart palette — deferred: the dashboard uses count tiles, not
      charts, so there is nothing yet for a data palette to colour

**Exit:** every entity round-trips create → edit → publish → delete from the
UI, and publishing appears on the public site without a rebuild. ✅

### Notes

- Deleting an author or category that is still referenced is refused with a
  count, rather than cascading. Silently destroying titles is worse than making
  the admin reassign them.
- Detail routes are dynamic again (`dynamicParams = true`) and writes call
  `revalidatePath`, which is what makes publishing take effect immediately.
  The cost is a soft 404 on slugs that never existed.
- Admin reads live in `server/admin/queries.ts`, separate from the public layer
  that filters to `status: published`.

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
