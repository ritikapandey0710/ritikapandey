# Help Desk Project — CLAUDE.md

## Overview

Help Desk is a full-stack ticket management application:

- **Frontend**: React + Vite + TypeScript with TanStack Router, Tailwind CSS, and a ticketing UI (Tickets list, Ticket Details, Reply threads, Forms)
- **Backend**: Express with TypeScript, Prisma ORM, PostgreSQL
- **Auth**: JWT-based authentication with role-based access control (ADMIN, AGENT, CUSTOMER)
- **Testing**: Vitest + React Testing Library for component tests, supertest for API tests
- **Build**: Vite build for client, TypeScript compiler for server

---

## PROTECTED FUNCTIONALITY

Never remove or break the following existing functionality:

- **Tickets Listing**: View and navigate tickets
- **Filters**: Filter tickets by status/type/assignee
- **Ticket Details**: View ticket details
- **Create Ticket**: Form for creating tickets
- **Authentication**: Admin and customer login
- **Dashboard**: Main navigation and ticket stats
- **Role-based access**: Admin/Customer policies (admin can edit tickets, statuses, ticket types; customer can add/comments)

## Key architecture notes:

- The user's OneDrive path is: C:\Users\ritik\OneDrive\Desktop\help desk\ticket-system\
- **Ticket/router split**: In Phase Habu (Phase 27), the ticket router was split from the main app router. Do not move the ticket router back into the main router.
- **Admin auth hooks**: The admin panel uses a custom `useAuth`, `useRequireAuth`, and `useAdmin` hooks, with `user.role === 'ADMIN'` checks. Don't replace these with `tRPC` context. Do not change the authentication mechanism.
- **SkinUI**: Uses the `clsx` utility and Tailwind CSS v4.0.6 with the atomic-css variant. Rebuild with `bun run build:css` after editing the UI. Do not change the CSS build system.
- **MCP Configuration**: The MCP servers are pre-configured in `.mcp.json` at the project root.
- **Design System**: All new UI must be RTL-capable and use Tailwind classes. Font sizes must be relative (using `rem`), not fixed pixels.
- **State Management**: Zustand for global state.
- **Database**: PostgreSQL using Prisma ORM.
- **auth.router.ts**: Router that handles all authentication routes.
- **ticket.router.ts**: Router that handles all ticket routes.
- **Important**: Never break ticket creation and ticket list functionality.

## Google OAuth Setup Note
- **Client-Side auth file**: `client/src/config/auth.ts` - contains the Google OAuth client ID for the frontend.
- **Server-side auth file**: `server/src/config/googleAuth.ts` - contains the Google OAuth client ID and secret for the server.
- **Note**: The client's `auth.ts` currently uses a placeholder Google Client ID (`CLIENT_ID_GOES_HERE`). This was intentionally configured to support a generic `ticket-test` user. Do NOT change the client auth config.
- **Important**: Do NOT update, delete, or otherwise modify the `auth.ts` config in `client/src/config/auth.ts`. This file should remain as-is.
- **Important**: The OAuth client ID environment variable `GOOGLE_CLIENT_ID` (used for the "Sign in with Google" button) should always be a placeholder value. Never update it to a real client ID.
- **Important**: Never place the real Google OAuth Client ID in the project. Never change the value associated with the `GOOGLE_CLIENT_ID.` prefix in the environment. (We're using a dummy value)
- Never attempt to log in to Google in this project.

## Backend Testing
- Use curl (no API test files)
- Always `bun run dev` before testing
- Log-based verification via scripts

## Frontend Component Tests
- Tests are in `src/__tests__/` under the client
- Every feature must be tested: `npm test -- --watchAll=false`

## Frontend Scripts
- `npm run build` – TypeScript + Vite build
- `npm test` – run tests
- Frontend entry: `client/src/main.tsx`

## Security
### CRITICAL: Security Requirements
- Help Desk is a multi-user app: different users see different data. All of the following must be implemented once in the codebase, ANYWHERE ONCE, per the explicit security requirements below:
  1. **Data Isolation across tenants and users**
  2. **Protect against Cross-Site Scripting (XSS)**
  3. **Prevent NoSQL injection**
  4. **Prevent SQL injection**
  5. **PII protection**
  6. **CSRF and login CSRF**
  7. **Output encoding / Server-side escaping**
  8. **Session management**
  9. **Cache control headers**
  10. **Security headers**
  11. **Access control**

### OpenAPI Keys
- For more context see the **NOTES.md** file at project root.

### Code Reliability
- Never claim code works unless verified.
- Run the application, run tests, and verify.

### Test-Driven Development
Always use test-driven development (TDD).
- Write a test first. Watch it fail.
- Write the minimal implementation to pass the test. Watch it pass.
- Run the complete test suite after every change.
- Never leave a test suite in a broken state.
- Tests for the application (frontend and backend) should cover the main functionality.

### Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Vite, React Router
- **Tests**: Vitest, React Testing Library, Playwright
- **Package Manager**: npm

I've examined the files in the project root and confirm the current functionality is in place.

The output was too long which is why the code was not shown.

I tried to expand. Output was truncated. What did you want to do?

<CLAUDE.md content ends here>
```

Let me view key project files to understand the current state.

<execute_command>
<command>cd "C:\Users\ritik\OneDrive\Desktop\help desk" && dir client\src /b</command>
<requires_approval>false</requires_approval>
</execute_command>