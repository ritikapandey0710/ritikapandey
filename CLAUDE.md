# CLAUDE.md

## AI-Powered Ticket Management System

This document provides context and guidelines for working on the AI‑powered ticket management system built with Express, React, TypeScript, and Bun.

### Project Overview
- **Goal**: Build a ticket management system that uses AI to automatically classify, respond to, and route support emails.
- **Key Features**:
  - Receive support emails and create tickets
  - Auto‑generate human‑friendly responses using a knowledge base
  - Ticket list with filtering and sorting
  - Ticket detail view
  - AI‑powered ticket classification
  - AI summaries
  - AI‑suggested replies
  - User management (admin‑only, admins can create additional agents)
  - Dashboard to view and manage all tickets
  - Ticket statuses: open, resolved, closed
  - Ticket categories: general question, technical question, refund request

### Technology Stack (see also `tech-stack.md`)
- **Backend**: Express.js with TypeScript, Bun runtime
- **Frontend**: React with TypeScript, Vite
- **Database**: PostgreSQL (session storage via `express-session` + `connect-pg-simple`)
- **Authentication**: 
  - **Backend**: Better Auth with email/password providers and PostgreSQL adapter
  - **Frontend**: Better Auth React client for authentication state management
  - **Features**: Email/password login, session management, protected routes
  - **Configuration**: Environment variables for AUTH_SECRET and BETTER_AUTH_URL
- **Data Validation**: Zod for runtime validation of API requests and form inputs
- **Validation Utilities**: Shared validation functions in `src/utils/validation.ts` for consistent error handling:
  - `handleZodError`: Formats Zod validation errors into consistent error objects
  - `validateRequiredFields`: Validates that required fields are present in objects
  - `validateEnumValue`: Validates that a value is one of the allowed enum values
- **Client-side Form Handling**: React Hook Form with Zod resolver for form state, validation, and submission in user creation feature
- **Error Handling**: Async handler wrapper for route handlers (provides Express 5-like automatic error handling for async routes)
- **AI/LLM**: OpenAI GPT‑4‑turbo (or open‑source LLM) via LangChain/LlamaIndex
- **Knowledge Base**: Vector store (Chroma or Pinecone)
- **Job Queue**: BullMQ (Redis‑backed) or Celery
- **Caching/Pub‑Sub**: Redis
- **File Storage**: Amazon S3 / MinIO
- **DevOps**: Docker Compose (dev), Kubernetes / managed containers (prod), GitHub Actions CI/CD
- **Observability**: Prometheus + Grafana, Loki, Sentry

### Frontend Data Fetching
- Use axios for making HTTP requests to the backend. A pre-configured axios instance is available in `client/src/api.ts`.
- Use React Query (TanStack Query) for data fetching, caching, and state management. The QueryClientProvider is set up in `client/src/main.tsx`.

### Using Context7 for Up‑to‑Date Documentation

The project has the **Context7** MCP server configured, allowing you to query the latest documentation for any library or tool directly from the chat.

**Command format**
```
/mcp context7 query-docs --libraryId <library-id> --query "<your question>"
```

**Common library IDs for this project**
- Express: `/expressjs/express`
- React: `/reactjs/react.dev`
- TypeScript: `/microsoft/typescript`
- Bun: `/oven-sh/bun`
- PostgreSQL (node‑pg): `/pugjs/pg` (if needed)
- Redis: `/redis/redis`
- BullMQ: `/treshugart/bullmq`
- LangChain: `/hwchase17/langchain`
- OpenAI: `/openai/openapi` (or use the official OpenAI docs via web search)

**Example**
```
/mcp context7 query-docs --libraryId /expressjs/express --query "How to use express.json() middleware?"
```

The tool will return the most recent, verified documentation excerpt, ensuring you always have up‑to‑date guidance.

### Testing Philosophy

**Prefer component tests over e2e tests.** The default choice for any new test should be a component test using Vitest and React Testing Library. E2e tests with Playwright should only be written when the scenario genuinely requires a real browser, real network, and multiple integrated services (e.g. a full sign-up → action → assertion flow that cannot be meaningfully replicated by mocking).

Ask before writing an e2e test: *can this be covered by rendering the component with mocked API/auth?* If yes, write a component test instead.

### Writing E2E Tests with e2e-test-writer

For writing end-to-end tests with Playwright, refer to the `e2e-test-writer` file in the project root. This file contains guidelines and instructions for creating effective E2E tests for the ticket management system.

### Writing Component Tests with Vitest and React Testing Library

For writing unit and integration tests for React components, we use Vitest and React Testing Library.

**Test File Conventions**
- Place test files alongside the component they test, using the `.test.tsx` or `.test.ts` extension.
  Example: `src/components/Button/Button.test.tsx`
- Alternatively, you can place tests in a `__tests__` directory adjacent to the component.

**Writing Tests**
- Use `describe` to group tests for a component or feature.
- Use `it` (or `test`) for individual test cases.
- Render the component using the provided `renderWithQuery` utility (found in `client/src/test/render-utils.ts`) when the component uses React Query or other context providers.
  Example:
  ```tsx
  import { renderWithQuery } from '../test/render-utils';
  import MyComponent from './MyComponent';

  describe('MyComponent', () => {
    it('renders correctly', () => {
      const { getByText } = renderWithQuery(<MyComponent />);
      expect(getByText(/Hello World/i)).toBeInTheDocument();
    });
  });
  ```
- For components that require authentication, mock the `authClient.useSession` hook as shown in `UserPage.test.tsx`.
- For data fetching, mock the API functions (e.g., `fetchUsers`) using `vi.mock` and control the return values (resolved, rejected, or pending).

**Running Tests**
- To run all tests: `bun run test` (from the client directory)
- To run tests in watch mode: `bun run test --watch`
- To run tests with UI: `bun run test:ui`
- To generate coverage report: `bun run test:coverage`

**Best Practices**
- Test the component's behavior, not its implementation details.
- Use accessibility roles and text to query elements (e.g., `getByRole`, `getByLabelText`, `getByText`).
- Avoid testing private functions or internal state directly.
- Mock external dependencies (API calls, timers, etc.) to make tests deterministic and fast.

### Development Workflow
1. **Clone the repository** and run `bun install` at the root.
2. Start the required services (Postgres, Redis, MinIO, Chroma) via `docker compose up -d`.
3. Run the backend: `bun run --workspace server dev`
4. Run the frontend: `bun run --workspace client dev`
5. Open `http://localhost:5173` in your browser.

### Using the UserRole Enum
To ensure type safety and prevent magic strings when working with user roles, use the `UserRole` enum defined in `client/src/types/role.ts`:

```typescript
import { UserRole } from '@/types/role';

// Usage examples:
// Comparing roles
if (user.role === UserRole.ADMIN) {
  // Admin-specific logic
}

// In conditional rendering
{user.role === UserRole.ADMIN && (
  <AdminOnlyComponent />
)}

// In switch statements
switch (user.role) {
  case UserRole.ADMIN:
    return <AdminView />;
  case UserRole.AGENT:
    return <AgentView />;
  default:
    return <DefaultView />;
}
```

Available roles:
- `UserRole.ADMIN` - Administrator with full access
- `UserRole.AGENT` - Support agent with limited permissions

This approach provides compile-time safety and prevents runtime errors from typos in role strings.

### Ticket Enums

Ticket-related enums (`TicketStatus`, `TicketCategory`) are declared as **TypeScript enums** in `client/src/types/ticket.ts`. A companion array is exported alongside each enum for iteration (e.g. in `<select>` options).

```typescript
// ✅ Correct — enum + iterable array
export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}
export const TICKET_STATUSES: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];

// ❌ Wrong — do not use union types or const objects
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export const TicketStatus = { OPEN: 'OPEN', ... } as const;
```

When adding a new ticket-related enum, follow the same pattern:
1. Declare the enum in `client/src/types/ticket.ts`.
2. Export a `TICKET_<NAME>S` array of that enum for iteration.
3. Use `z.union([z.literal(...), ...])` in Zod schemas — not `z.nativeEnum()`.
4. Type lookup maps (e.g. `STATUS_LABELS`) as `Record<TicketStatus, ...>` so TypeScript enforces exhaustiveness.

### Contributing
- Follow the existing code style (ESLint + Prettier).
- Write tests for new features.
- Keep dependencies up‑to‑date; use `bun update` periodically.
- Document any new libraries or tools added so they can be queried via Context7.

---

*Feel free to extend this file as the project evolves.*