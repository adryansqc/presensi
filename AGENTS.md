<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# presensi-jambi-baru

Next.js 16.4.6 + React 19.3.0, Tailwind CSS 4 (turbopack), Prisma 7.10.1 + PostgreSQL (Neon). Presensi pengajian app: jadwal, jamaah, presensi, rekap, role/permission RBAC.

## Commands

- `npm run dev` — dev server (Turbopack), http://localhost:3000
- `npm run build` — `prisma generate && next build`
- `npm start` — `next start`
- `npm run lint` — `eslint` (eslint-config-next)
- Typecheck: `npx tsc --noEmit` (no `typecheck` script; tsconfig has `noEmit: true`)
- No test runner or test script exists — no tests to run

Command order when changing the DB schema: edit `prisma/schema.prisma` → `npx prisma migrate dev --name <name>` → `npx prisma generate` → `npm run build`.

## Prisma (read before touching data layer)

- Prisma Client output is **`app/generated/prisma`**, not the default `@prisma/client`.
- `lib/prisma.ts:3` and every `scripts/seed-*.ts` import from `../app/generated/prisma/client`. Do not import `@prisma/client` directly.
- `lib/prisma.ts:10` — bump `PRISMA_CLIENT_VERSION` whenever `schema.prisma` changes so the dev server's `globalThis` client cache is invalidated.
- `postinstall` and `build` both run `prisma generate`.

## Environment

- `.env` exists locally with real credentials (Neon `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`). Do not commit actual values.
- `.env*` is gitignored. Required vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

## Auth

- next-auth v4, `CredentialsProvider`, JWT session strategy, `PrismaAdapter(prisma)` (`lib/auth.ts`).
- Role is read from the database, never the frontend (`lib/auth.ts:51`).
- Route guards: `lib/auth-helpers.ts` — `requireAuth()`, `requireRole([...])`, `requirePermission("xxx")`.
- `proxy.ts` = `withAuth` middleware matching `/dashboard/:path*` and `/admin/:path*`. It is not imported anywhere (no `middleware.ts`) — treat it as unwired/reference code unless you wire it.

## Seed scripts (`scripts/`)

`seed-admin.ts`, `seed-desa-kelompok.ts`, `seed-kategori.ts`, `seed-permissions.ts`. Each loads dotenv and writes to the live Neon DB. Default admin: `admin@jambikota1.local` (role `Super_Admin`, `hidden: true`).

## Conventions

- Path alias: `@/*` → `./*` (`tsconfig.json:22`)
- API routes under `app/api/` (`admin/`, `public/`, `absen/`); see `API_DOCUMENTATION.md` for endpoint/auth rules.
- Server actions/components under `app/(auth)`, `app/absen`, `app/admin`, `app/dashboard`; shared UI in `components/`.
- Role values: `Super_Admin`, `Admin_CAI`, `Desa`, `Kelompok`; `User.hidden = true` hides accounts from user lists (`API_DOCUMENTATION.md`).
- `.env`, `.next/`, `out/`, `build/`, `*.tsbuildinfo`, `next-env.d.ts` are gitignored.

## Presensi (performa penyimpanan)

- `PresensiDetailManager.handleSave` (components/admin/PresensiDetailManager.tsx) sekarang mengirim **satu request bulk** ke `POST /api/admin/presensi/bulk` dengan semua jamaah, bukan satu `fetch` berurutan per orang. Jangan kembali ke loop per-orang — itu menyebabkan N×(4–5 kueri DB ke Neon) dan terasa sangat lama.
- Endpoint bulk `app/api/admin/presensi/bulk/route.ts` memproses create/update dalam satu `prisma.$transaction`, hanya ~4 kueri DB terlepas dari jumlah orang.
- Endpoint tunggal `app/api/admin/presensi/route.ts` (POST) masih ada dan digunakan untuk satu orang, tapi lebih lambat dari bulk saat banyak data.