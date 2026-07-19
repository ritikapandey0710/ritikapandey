## Summary of Changes

### Files Modified:
1. `server/prisma/schema.prisma` - Updated User model to match Better Auth expectations (changed id to String, added emailVerified and image, removed passwordHash, kept role). Added Session, Account, and Verification models. Updated Ticket.authorId to String.
   - Updated to Prisma 7 syntax: datasource uses `provider = "postgresql"` and `url = env("DATABASE_URL")`.
   - Removed any hardcoded database URLs; relies on environment variable.
2. `server/prisma/prisma.config.ts` - Updated to remove datasource configuration (not needed for Prisma ORM) and keep only schema and migration paths.
3. `server/src/auth.ts` - Created Better Auth instance with Prisma adapter and email/password provider.
4. `server/src/index.ts` - Added Better Auth middleware to handle `/api/auth/*` routes before JSON body parser.
5. `server/src/routes/auth.ts` - Created route file that mounts the Better Auth handler (though currently unused due to direct mounting in index.ts).
6. `server/.env` - Added `AUTH_SECRET` environment variable.
7. `server/package.json` - Added dependencies: `better-auth`, `@better-auth/adapter-prisma`, `bcryptjs`.

### Files Created:
- `server/setup.sh` - Script to install dependencies, generate Prisma client, and run migrations.

### Next Steps:
1. Run the setup script to install dependencies and prepare the database:
   ```bash
   cd server
   chmod +x setup.sh   # (if on Unix-like system)
   ./setup.sh
   ```
   Alternatively, run the commands manually:
   ```bash
   bun install
   bunx prisma generate
   bunx prisma migrate dev --name init   # or use `bunx prisma db push` for non-migration workflow
   ```

2. After setup, start the development server from the project root:
   ```bash
   bun run dev
   ```
   This will start both the server and client.

3. The authentication endpoints will be available under `/api/auth/*`:
   - POST `/api/auth/register` - Register a new user
   - POST `/api/auth/login` - Login user
   - POST `/api/auth/logout` - Logout user
   - GET `/api/auth/session` - Get current session

### Notes:
- The setup script assumes you have Bun installed and are using a Unix-like shell (Git Bash on Windows works).
- The database migrations will create the necessary tables for Users, Sessions, Accounts, and Verifications.
- The existing User table will be altered to match the new schema. Ensure your database is backed up if you have important data.
- For production, replace the `AUTH_SECRET` value with a strong, randomly generated string.

### Verification:
After starting the server, you can test the endpoints with tools like curl or Postman. For example:
- Register: `curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password","name":"Test User"}'`
- Login: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password"}'`
- Session: `curl -X GET http://localhost:3000/api/auth/session` (should return session data if login succeeded)