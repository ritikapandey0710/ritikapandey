# Help Desk Project — Complete Audit Report

Date: 2026-08-16
Scope: Frontend (client/), Backend (server/), Database (Prisma/PostgreSQL), Auth (Better Auth), Tests, Config

---

## CRITICAL ERRORS (break the application)

1. **`client/src/pages/TicketsPage.tsx` does not compile** — TS syntax error in the `onSubmit` type annotation (lines 31–38). `z.infer<typeof z.object({...})>` inline in a `.tsx` file fails to parse (`TS1005: '>' expected`). This breaks the entire client build (`tsc -b`).

2. **Ticket Details page lost the reply functionality (regression)** — The protected "Ticket replies, Reply persistence, Reply composer, Multiple replies" feature is completely absent from `TicketDetailsPage.tsx`. The page renders no conversation thread and no reply composer. `TicketDetailsPage.test.tsx` (581 lines) expects a reply composer (`data-testid="reply-composer"`), reply thread states ("No replies yet", "Loading replies", "Failed to load replies"), and `createReply`/`fetchRepliesByTicketId` usage. CLAUDE.md documents this as required working functionality.

3. **Ticket Details page does not use the `UpdateTicket` component** — The assignee/status/category edit controls are duplicated inline instead of using `components/UpdateTicket.tsx`. Tests expect `data-testid="assignee-controls"`, `status-controls`, `category-controls`, `assign-to-select`, `status-select`, `category-select` (all present in `UpdateTicket.tsx`).

---

## BUGS (functional problems)

1. **Create-ticket API contract mismatch** — `api.ts createTicket()` sends `subject`/`body`; backend `createTicket` expects `title`/`description`. Creating a ticket via the modal fails with "Title is required". (Confirmed by `e2e/tests/ticket-management.spec.ts` which expects creation to succeed.)

2. **Ticket description never displays** — Frontend `Ticket` type uses `body`; backend returns `description`. `ticket.body` is always `undefined`, so "No description provided" is always shown on the details page and in `TicketDetail.tsx`.

3. **TicketsPage "View" action uses `alert()`** — The Actions column "View" button calls `alert()` instead of navigating to the ticket. `TicketTable.tsx` has the same issue (with a TODO comment).

4. **`server/src/services/email.service.ts` references undefined `senderName`/`senderEmail`** in `createTicketFromEmail()` — would throw a ReferenceError if email processing ever runs (lines 182–183).

5. **`components/ui/Skeleton.tsx` uses dynamic Tailwind classes** (`w-${width}`, `h-${height}`) which Tailwind's JIT cannot generate — skeleton widths/heights would not apply.

6. **`UserPage.test.tsx` uses undefined `passwordInput`** variable (declared as `_passwordInput`) — test would throw ReferenceError.

7. **`UserPage.test.tsx` expects `data-testid="backdrop-edit"`** but `UserModal` renders `data-testid="backdrop"` — test would fail.

---

## DUPLICATES

1. **`components/TicketTable.tsx`** — duplicates the table rendering in `TicketsPage.tsx` (needs usage verification).
2. **`components/TicketDetail.tsx`** — duplicates display logic in `TicketDetailsPage.tsx` (used by tests only).
3. **`components/UpdateTicket.tsx`** — duplicates edit controls in `TicketDetailsPage.tsx` (currently unused by the page).
4. **`test/routing-test.tsx` and `test/routing.test.tsx`** — identical duplicate test files.
5. **`STATUS_LABELS`/`CATEGORY_LABELS`/`PRIORITY_LABELS`** — defined in both `utils/ticketUtils.ts` and `TicketDetailsPage.tsx`.
6. **`getStatusLabel`/`getCategoryLabel`** — defined in both `utils/ticketUtils.ts` and `TicketDetailsPage.tsx`.

---

## UNUSED FILES (verified or pending verification)

- `client/src/App.css` — Vite template CSS, not imported anywhere.
- `client/src/components/TestShadcn.tsx` — test component, not referenced.
- `client/src/components/TicketDetailSkeleton.tsx` — not referenced (uses broken Skeleton).
- `client/src/setupTests.ts` — not referenced by vitest config (uses `src/test/setup.ts`).
- `client/src/test-import.ts` — empty file.
- `client/src/pages/TicketsPage.tsx.orig`, `TicketsPage.tsx.original`, `TicketDetailsPage.tsx.original` — old backups.
- `client/package.json.bak`, `package.json.bak2`, `tsconfig.json.bak` — backups.
- `server/src/services/email.service.ts.bak`, `server/src/modules/user/user.router.ts.bak` — backups.
- `server/prisma/schema.prisma.backup`, `schema.prisma.bak` — backups.
- `server/src/generated/` and root `src/generated/` — generated Prisma client (regenerable).
- Many server debug scripts: `check_accounts.ts`, `check_db_state.js`, `check_env.ts`, `check_reply_table.js`, `check_tickets.js`, `check_tickets.ts`, `check_users.ts`, `fix_ticket_column.js`, `migrate.js`, `migrate.ts`, `seed_tickets.ts`, `server_simple.ts`, `set-admin.ts`, `test_*.js`, `test*.ts`, `verify_reply_fix.js`, `verify.ts`, `test_pg.js`, `test_pg2.js`, `test_db.js`, `test_error.js`, `test_error2.js`, `test_reply_table.js`, `test_simple.js`, `test_simple.ts`, `test-prisma.ts`, `test-prisma2.ts`, `test.js`, `test.ts`, `test2.js`, `test3.js` — debug/scratch scripts not referenced by package.json (only `seed.ts` is).
- Root-level scratch files: `temp_copy.ts`, `ticket.patch`, `setup_db.sql`, `test_pg.js`, `null`, `c`, `dev.pid`, `client.err`, `server.err`, `server.out`, `client.out`, `server_new.err`, `server_new.out`, `client_new.err`, `client_new.out`, `test_run.err`, `test_run.out`, `backend.err`, `backend.out`, `dev.err`, `dev2.pid`, `dev3.pid`, `dev.pid`, `test-output.txt`, `actual_output.txt`, `agent_cookies.txt`, `auth_cookies2.txt`, `consent_*.txt/md`, `cookies*.txt`, `final_*.txt`, `last_*.txt`, `login_test.json`, `output*.txt`, `resp*.txt`, `temp_auth.txt`, `test.txt`, `the_*.txt`, `client/agent.cookie`, `client/admin.cookie`, `client/*.cookie`, `client/*.txt` — debug/scratch artifacts.

---

## UNUSED CODE

- `console.log` debug statements: `server/src/index.ts` (lines 2, 12, 56), `server/src/ticket.controller.ts` (line 5), `client/vite.config.ts` (line 8).
- `console.log` in test files (debug noise).
- Unused imports in several files (verified during cleanup).

---

## DATABASE ISSUES

1. **Hardcoded database credentials** in `server/src/prisma.ts` (line 8) and `server/seed.ts` (line 7) — `postgresql://postgres:...@localhost:5432/helpdesk`. Security risk; ignores `DATABASE_URL` env var.
2. Schema itself is consistent (User, Session, Account, Verification, Ticket, Reply). No destructive changes needed.

---

## API ISSUES

1. `fetchTickets` sends `assignedTo` param; backend expects `assigneeId` (param is effectively ignored).
2. `createTicket` sends `subject`/`body`; backend expects `title`/`description` (breaks creation).
3. `updateTicket` (api.ts) types `body` but backend expects `description`.

---

## AUTHORIZATION ISSUES

1. **Ticket routes have no ownership/permission enforcement on the backend** — any authenticated user can view/update/delete any ticket. The frontend restricts updates to admins, but the backend does not enforce it. (Noted as "For now..." comments in `ticket.controller.ts`.) This is a genuine security gap, but changing it risks breaking working features; flagged for review rather than auto-changed.

---

## TYPESCRIPT ISSUES

- **Client**: `TicketsPage.tsx` syntax error (critical, blocks build).
- **Server**: `index.ts(56)` `auth.options.basePath` type error; `email.service.ts` — missing `imap` types, `AddressObject` type mismatch, `string | false` mismatch, undefined `senderName`/`senderEmail`.

---

## UI/UX ISSUES

- No consistent design system; pages use ad-hoc inline Tailwind with inconsistent spacing/colors.
- Top navbar only — no sidebar (task requires a modern sidebar).
- Dashboard has no charts, no recent-tickets section, no status/priority/category overview.
- Ticket details page shows Assignee/Status/Category twice (display + edit) and is cluttered.
- Reply functionality missing entirely.
- Loading states are plain spinners; no skeletons on most pages.
- No consistent empty/error state components.

---

## RESPONSIVE ISSUES

- Tables use `overflow-x-auto` (acceptable). Sidebar/navbar not responsive to a collapsible layout. Needs verification across breakpoints after redesign.

---

## RECOMMENDED CLEANUP (safe improvements)

1. Fix the critical compile error in `TicketsPage.tsx` (extract Zod schema).
2. Restore reply functionality + `UpdateTicket` usage in `TicketDetailsPage.tsx`.
3. Fix `createTicket` API contract (send `title`/`description`).
4. Fix `Ticket` type to use `description` (align with backend) and update components/tests.
5. Make TicketsPage "View" action navigate to the ticket.
6. Fix `email.service.ts` undefined variables.
7. Remove debug `console.log`s.
8. Remove verified-unused files (backups, scratch, debug scripts).
9. Remove duplicate components/tests.
10. Move hardcoded DB credentials to env vars.
11. Modernize UI with a consistent design system, sidebar, dashboard, and polished pages.