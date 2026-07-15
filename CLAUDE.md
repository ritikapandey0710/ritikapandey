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
- **Authentication**: Database‑backed sessions
- **AI/LLM**: OpenAI GPT‑4‑turbo (or open‑source LLM) via LangChain/LlamaIndex
- **Knowledge Base**: Vector store (Chroma or Pinecone)
- **Job Queue**: BullMQ (Redis‑backed) or Celery
- **Caching/Pub‑Sub**: Redis
- **File Storage**: Amazon S3 / MinIO
- **DevOps**: Docker Compose (dev), Kubernetes / managed containers (prod), GitHub Actions CI/CD
- **Observability**: Prometheus + Grafana, Loki, Sentry

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

### Development Workflow
1. **Clone the repository** and run `bun install` at the root.
2. Start the required services (Postgres, Redis, MinIO, Chroma) via `docker compose up -d`.
3. Run the backend: `bun run --workspace server dev`
4. Run the frontend: `bun run --workspace client dev`
5. Open `http://localhost:5173` in your browser.

### Testing
- Unit tests: Jest/Vitest
- E2E tests: Playwright or Cypress (to be added)
- Run tests with `bun test` (configured in each workspace).

### Contributing
- Follow the existing code style (ESLint + Prettier).
- Write tests for new features.
- Keep dependencies up‑to‑date; use `bun update` periodically.
- Document any new libraries or tools added so they can be queried via Context7.

---

*Feel free to extend this file as the project evolves.*