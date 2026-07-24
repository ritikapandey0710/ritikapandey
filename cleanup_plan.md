PLAN FOR AUTHENTICATION-ONLY PROJECT CLEANUP

FILES TO DELETE:
1. client/src/pages/CreateTicketPage.tsx
2. client/src/api.ts
3. client/src/components/Navbar.tsx
4. client/src/App.jsx
5. server/src/ticket.controller.ts
6. server/src/ticket.router.ts
7. server/prisma/migrations/20260719150926_init_ticket (entire folder)
8. server/prisma/migrations/20260721182830_drop_ticket_table (entire folder)
9. server/src/generated/prisma/models/Ticket.ts
10. client/node_modules/.tmp
11. server/src/index.ts.bak

FILES TO MODIFY:
1. client/src/pages/HomePage.tsx - Simplify to show only welcome message after login
2. client/src/main.tsx - Remove ticket route references, keep only login/signup/home
3. server/src/index.ts - Remove ticket API routes and extra endpoints (/api/users, /api/db-test, etc.)
4. server/prisma/schema.prisma - Remove Ticket model and all relations to User

KEEP THESE ESSENTIAL FILES:
- Client: 
  * client/src/pages/LoginPage.tsx (handles both login and signup)
  * client/src/pages/HomePage.tsx (simplified welcome page)
  * client/src/lib/auth-client.ts (auth configuration)
  * client/src/main.tsx (routing)
  * client/src/App.jsx or App.tsx (keep one - I'll keep App.tsx as it's more complete)
  * client/src/index.css
  * client/src/assets (keep default Vite assets)
  
- Server:
  * server/src/index.ts (modified - auth routes only)
  * server/src/auth.ts (BetterAuth configuration)
  * server/src/prisma.ts (Prisma client setup)
  * server/prisma/schema.prisma (modified - User, Session, Account, Verification only)
  * server/prisma/migrations/20260717103855_init (initial migration)
  * package.json files in root, client, and server

NEXT STEPS AFTER APPROVAL:
1. Delete the listed files
2. Modify the specified files
3. Remove the ticket migration folders
4. Update Prisma schema to remove Ticket model
5. Regenerate Prisma client
6. Verify the project builds and runs
7. Test signup, login, logout functionality

Please approve this plan before I proceed with the changes.