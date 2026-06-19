
## Context

The uploaded zip is a Next.js app whose Supabase backend is broken. This Lovable project is TanStack Start (blank scaffold). I'll port the UI from the uploaded code as-is — same look, layout, copy, and components — and wire it to a fresh Lovable Cloud backend. Next.js-specific bits (`next/link`, `next/navigation`, `app` router conventions, server components) get swapped for TanStack equivalents during the port; the visible UI stays the same.

## UI port (preserve the look)

Carry across from the uploaded `src/`:
- **Landing page** (`app/page.tsx`) → `src/routes/index.tsx`. Hero, feature grid, "Neptora" brand mark, gold/black palette.
- **Login page** (`app/login/page.tsx`) → `src/routes/auth.tsx`. Same email/password form UI, wired to Supabase auth.
- **Dashboard layout + sidebar** (`app/dashboard/layout.tsx`, `components/layout/dashboard-sidebar.tsx`) → `src/routes/_authenticated/route.tsx` already exists as the gate; add a `src/routes/_authenticated/dashboard.tsx` layout that renders the sidebar + `<Outlet />`. The sidebar's `next/link` + `usePathname` get swapped for TanStack `Link` + `useRouterState`.
- **Dashboard pages**:
  - `dashboard/page.tsx` (new affidavit / template picker + form) → `_authenticated/dashboard/index.tsx`
  - `dashboard/saved/page.tsx` → `_authenticated/dashboard/saved.tsx`
  - `dashboard/templates/page.tsx` → `_authenticated/dashboard/templates.tsx`
  - `dashboard/settings/page.tsx` → `_authenticated/dashboard/settings.tsx`
- **Global styles** (`app/globals.css`): port the design tokens (Playfair Display serif headings, gold accent `#C9A227`-ish, black primary, custom utility classes like `btn-primary`, `transition-smooth`, `gradient-gold`, `card-gold`) into `src/styles.css` using the existing `@theme inline` + CSS-var setup. Playfair Display loaded via `<link>` in `__root.tsx` head.
- **Icons**: `lucide-react` already works; keep all icon imports.
- **Supabase calls**: every `createClient()` from `@/lib/supabase/client` becomes the Lovable-provided browser `supabase` from `@/integrations/supabase/client`. `router.push(...)` becomes `navigate({ to: ... })`.

Any DOCX/PDF generator imports (`docx-generator.ts`, `pdf-generator.ts`, `docx-parser.ts`) are Node-only and won't run in the Worker runtime — for v1 the "Generate" button produces an in-app preview + `.txt` download. The UI itself (buttons, modals, form steps) stays exactly as in the upload; only the file output format changes. PDF/DOCX can be added in a follow-up with Worker-compatible libs.

## Backend (fresh Lovable Cloud / Supabase)

Tables in `public`, with explicit GRANTs and RLS:

- `profiles` — `id (uuid PK → auth.users)`, `email`, `full_name`, `firm_name`, `created_at`, `updated_at`. Auto-created on signup via `handle_new_user()` trigger.
- `templates` — `id`, `name`, `description`, `category`, `body_template` (text with `{{field_key}}` placeholders), `merge_fields` (jsonb), `is_active`, `created_at`. Seeded with the 3 templates from the original schema (Affidavit of Service, Applicant, Execution).
- `affidavits` — `id`, `user_id (→ auth.users)`, `template_id`, `title`, `client_name`, `matter_reference`, `form_data` (jsonb), `generated_content` (text), `status` ('draft'|'generated'), `created_at`, `updated_at`.

RLS:
- `profiles`: user SELECT/UPDATE own row.
- `templates`: authenticated SELECT where `is_active`.
- `affidavits`: user SELECT/INSERT/UPDATE/DELETE own rows.
- GRANTs to `authenticated` + `service_role` on every public table.

Admin roles, audit log, and storage buckets from the original schema are dropped for v1 (not used by the ported UI).

## Wiring

- Lovable Cloud enabled → env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` populated.
- Auth flow: email/password sign-up + sign-in on `/auth`; `emailRedirectTo: window.location.origin`. Root `onAuthStateChange` filtered to `SIGNED_IN | SIGNED_OUT | USER_UPDATED` to invalidate router + queries.
- All reads/writes use the browser Supabase client (RLS as the user) — no server functions needed for v1.
- TanStack Query for caching; mutations invalidate the relevant keys.
- Sign-out: cancel queries → clear cache → `signOut()` → `navigate('/auth', { replace: true })`.
- Protected routes under `src/routes/_authenticated/` rely on the integration-managed gate.

## Out of scope for v1

- Real PDF/DOCX export (download = `.txt` in v1).
- DOCX template upload (`templates` page in the upload has an upload UI — keep the UI but disable/stub the upload action with a "coming soon" toast).
- Admin/lawyer/clerk roles + audit log.

Approve and I'll implement.
