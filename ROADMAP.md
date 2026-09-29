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

- [ ] Real company information (tagline, contact, address, socials) — editable at `/admin/settings`; the name and brand colours now come from the supplied logo
- [ ] Higher-resolution hero photograph — the supplied image is 800x533, which is upscaled across a full-bleed hero and looks soft above about 1280px wide
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

- [x] Magic-link sign-in by email, alongside the password form

**Exit:** logged-out `/admin/*` redirects; tampered tokens refused; non-admin
roles rejected in `authorize()` as well as the proxy. ✅

### Magic-link notes

- Hand-rolled rather than Auth.js's Email provider, which requires a database
  adapter. A second Credentials provider keeps JWT sessions, which the edge
  proxy depends on.
- Only the SHA-256 hash of a token is stored, tokens are single-use, expire
  after 15 minutes, and are capped at 3 requests per address per window.
- `/admin/verify` must stay outside the proxy gate, or the token is redirected
  away before it can be exchanged for a session.
- Without RESEND_API_KEY, development prints the link to the server console.
  Production refuses to send rather than falling back silently.

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

## Phase 8 — SEO ✅

- [x] `generateMetadata` per route, resolved from `SiteSettings` with
      `site-config.ts` as fallback
- [x] Canonical URL on every public page
- [x] Dynamic `sitemap.ts` built from published slugs, `robots.ts`
- [x] OG image generated by `next/og`, drawn from the live settings
- [x] JSON-LD: Organization, WebSite, Book, Person, Article, BreadcrumbList

**Exit:** structured data present and valid on a book, author and article page;
drafts absent from the sitemap. ✅

### Notes

- `getSiteMeta()` is wrapped in React `cache`, so a page and its
  `generateMetadata` share one settings read per request. It falls back to the
  static config on any read failure — metadata must never be what takes a page
  down.
- Sitemap and OG absolute URLs come from `NEXT_PUBLIC_SITE_URL`. It is still
  `http://localhost:3000`, so it **must** be set to the real origin before
  deploying or every canonical and sitemap entry will point at localhost.
- Rich Results itself was not run: it needs a public URL. The payloads were
  verified as valid JSON with the required fields present.

## Phase 9 — Security ✅

- [x] Security headers and a CSP, applied in `next.config` so static routes
      are covered too
- [x] Brute-force protection on password sign-in, and a cap on uploads
- [x] Query-injection audit: every `searchParams` read is `typeof`-guarded, so
      `?q[$ne]=` cannot arrive as an object, and every `$regex` is escaped
- [x] No server secret reaches the client bundle — verified by scanning the
      built assets, not by inspection
- [x] `/security-review` pass: no HIGH or MEDIUM findings
- [x] Removed `isomorphic-dompurify`, which was never imported

**Exit:** `/security-review` pass, then fixes. ✅

### Notes

- `script-src` allows `'unsafe-inline'`. A nonce is the strict alternative, but
  Next can only inject one while server-rendering, so every page carrying it
  must be dynamic — which would undo the static rendering Phase 8 depends on,
  and silently break any page that later becomes static. The app renders no
  user-supplied HTML, so the gap has no route to it. Upgrade path is documented
  in `next.config.ts`.
- Rate limiting is stored in MongoDB, not memory: serverless instances do not
  share memory, so a process-local counter resets on cold start and is evaded
  by spreading requests across instances.
- The article body is plain text rendered as React text nodes, so there is
  nothing to sanitise yet. If rich text is ever added, sanitisation has to come
  with it.
- `img-src 'self'` means externally hosted images need `NEXT_PUBLIC_ASSET_HOST`
  set; the image picker's "paste a URL" option is otherwise limited to uploads.

## Phase 10 — Testing, optimisation, ship

- [ ] Vitest on Zod schemas and utils
- [ ] Playwright smoke: homepage, publication detail, search, submission, admin login, admin CRUD
- [ ] `typecheck` → `lint` → `build`, fix everything
- [ ] Manual pass over public + admin at 375 / 768 / 1440; Lighthouse
- [ ] Final commit and push

**Exit:** green gates, verified pages, shipped.
