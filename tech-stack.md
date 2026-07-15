# Technology Stack for AI-Powered Ticket Management System

## Overview
This document outlines the recommended technology stack for the AI‑powered ticket management system, incorporating the requested use of **database sessions for authentication**.

---

## 1. Architecture Diagram (textual)

```
Email Ingest (IMAP/SMTP) --> API Gateway --> AI Service (LLM + RAG)
                                 |                     |
                                 v                     v
               +-------------------+          +-------------------+
               |   Web Frontend    |          |  Knowledge Base   |
               |   (React/TS)      |          |  (Vector DB)      |
               +-------------------+          +-------------------+
                                 |                     |
                                 v                     v
               +-------------------+          +-------------------+
               |   API Service     | <~~~~>   |  Relational DB    |
               | (Node/Express or  |          |  (PostgreSQL)     |
               |  Django/DRF)      |          +-------------------+
               +-------------------+                 ^
                                 |                     |
                                 v                     |
                      +-------------------+   +-------------------+
                      |   Auth Service    |   |   Task Queue      |
                      | (Database Sessions)|   | (BullMQ / Celery) |
                      +-------------------+   +-------------------+
                                 |                     |
                                 v                     v
                       +-------------------+   +-------------------+
                       |   Object Store    |   |   Observability   |
                       |  (S3 / MinIO)     |   | (Prometheus, Grafana,
                       +-------------------+   |  Loki, Sentry)    |
                                                +-------------------+
```

*All services run in Docker; orchestrated via Docker‑Compose for development and Kubernetes (or managed containers) for production.*

---

## 2. Stack Recommendations by Concern

| Concern | Recommended Technology | Why it fits |
|---------|------------------------|-------------|
| **Frontend (UI)** | React 18 + TypeScript + Material‑UI (MUI) or Ant Design | Rich, responsive dashboards; type‑safe API clients; large ecosystem. |
| **Backend API** | **Option A:** Node.js + Express + TypeScript  **or** **Option B:** Django + Django‑REST‑Framework (DRF) | Node excels at I/O‑heavy email handling; Django provides a ready‑made admin UI where admins can create agents. Choose based on team skill‑set. |
| **Database (core ticket/agent/session data)** | PostgreSQL (managed: Aurora, RDS, Cloud SQL, or Supabase) | Relational model fits tickets, agents, categories, statuses, and **session storage**; ACID guarantees. |
| **Authentication** | **Database‑backed sessions** (see Section 3) – using `express-session` + `connect-pg-simple` (Node) **or** Django’s built‑in session framework (uses `django_session` table). | Keeps session state in the same PostgreSQL instance, simplifying backup, scaling, and GDPR compliance. |
| **Knowledge‑base / Vector Search** | Chroma (open‑source) **or** Pinecone (managed) + LangChain/LlamaIndex for Retrieval‑Augmented Generation (RAG) | Stores FAQs, past resolutions; enables semantic search for AI‑generated replies. |
| **AI / LLM Layer** | OpenAI GPT‑4‑turbo (API) **or** open‑source LLM (Llama‑3‑8B via HuggingFace TGI/vLLM) wrapped with LangChain/LlamaIndex | High‑quality replies; can start with API and later move to self‑hosted for cost/privacy. |
| **Email Ingestion / Sending** | Node: `nodemailer` + `imap-simple`  **or** Python: `imaplib` + `smtplib` (async variants). Managed services like SendGrid/Mailgun/Amazon SES for outbound; inbound via IMAP polling or webhook. | Turns incoming emails into ticket records and sends AI‑generated replies. |
| **Background Job Queue** | BullMQ (Node, Redis‑backed) **or** Celery (Python, Redis/RabbitMQ) | Offloads email fetch, email send, LLM calls, embedding generation; guarantees at‑least‑once processing. |
| **Caching / Pub‑Sub** | Redis (managed: Elasticache, Azure Redis, Cloud Memorystore) | Fast look‑ups for recent tickets, session store (if using Redis‑based session store as fallback), and broker for BullMQ/Celery. |
| **File / Attachment Storage** | Amazon S3 (or MinIO for self‑hosted) with presigned URLs | Securely stores email attachments and serves them via short‑lived URLs. |
| **DevOps / CI/CD** | GitHub Actions → Docker Buildx → Push to ECR/ACR/GCR → Deploy via Helm (K8s) or Docker‑Compose (dev) | Automated testing, linting, security scans; easy promotion dev → staging → prod. |
| **Observability** | Prometheus + Grafana (metrics) + ELK or Loki (logs) + Sentry (error tracking) | Monitors email‑processing lag, LLM latency, ticket resolution times, error rates. |
| **Testing** | Jest + React Testing Library (frontend); Jest/Vitest (Node TS) or pytest (Django/Python) (backend); Cypress/Playwright (E2E) | Guarantees refactors don’t break ticket flow or AI integration. |

---

## 3. Authentication – Database Sessions

To satisfy the requirement of using **database sessions for authentication**, the stack leverages the existing PostgreSQL instance to store session data.

### Node.js / Express Implementation
```bash
npm install express-session connect-pg-simple pg
```
```javascript
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(
  session({
    store: new pgSession({
      pool: pgPool,               // Uses the same PostgreSQL pool
      tableName: 'user_sessions', // Custom table for sessions
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS in prod
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
```
Database schema for `user_sessions` (created automatically by `connect-pg-simple` or via migration):
```sql
CREATE TABLE user_sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IDX_user_sessions_expire ON user_sessions(expire);
```

### Django Implementation
Django’s built‑in session framework already uses a database table (`django_session`) when `SESSION_ENGINE = 'django.contrib.sessions.backends.db'`.
```python
# settings.py
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400  # 1 day in seconds
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True  # if using HTTPS
```
Run migrations to create the table:
```bash
python manage.py migrate
```

**Benefits**
- Single source of truth: user data and session data live in PostgreSQL.
- Simplifies backup/restore and GDPR deletion (sessions can be purged alongside user data).
- Horizontal scaling works naturally with managed PostgreSQL (read replicas, connection pooling).

---

## 4. How the Stack Satisfies Each Feature

| Feature | Implementation Highlights |
|---------|---------------------------|
| Receive support emails & create tickets | IMAP poller (BullMQ worker) → parses email → creates `Ticket` row (status=`open`) → enqueues AI classification job. |
| Auto‑generate human‑friendly response using a knowledge base | Worker: 1) Classify ticket (LLM prompt) → store `category`. 2) Retrieve relevant KB chunks via vector search (Chroma/Pinecone). 3) Generate reply with RAG prompt → store as `ai_suggested_reply`. |
| Ticket list with filtering & sorting | React DataGrid (MUI/AntD) backed by API `/tickets?status=open&category=technical&sort=-createdAt`. |
| Ticket detail view | Route `/tickets/:id` fetches ticket, attachments, AI summary, suggested reply, conversation thread. |
| AI‑powered ticket classification | Same classification step; optional fine‑tuned DistilBERT for latency/cost. |
| AI summaries | On demand or after resolution, run summarization prompt over email thread, store `ai_summary`. |
| AI‑suggested replies | Editable field; agents can click “Use suggestion” to pre‑populate reply editor. |
| User management (admin only) | Auth0/Firebase for identity + optional `role` column in `users` table. Admin UI (protected route) lists users and has “Create Agent” form calling `POST /agents`. |
| Dashboard to view & manage all tickets | Dashboard pulls aggregates via API (`/metrics/tickets-by-status`, `/metrics/avg-response-time`) and renders charts (Recharts/Chart.js). |
| Ticket status management (open, resolved, closed) | `ticket.status` ENUM; transitions logged in `ticket_audit` table. |
| Ticket categorization (general question, technical question, refund request) | `ticket.category` ENUM; set by classification model; agents can override via dropdown. |

---

## 5. Sample Folder Layout (Monorepo)

```
ticket-system/
├─ packages/
│   ├─ web/                # React + Vite + TS + MUI
│   ├─ api/                # Node/Express + TS  OR  Django/DRF
│   ├─ ai-worker/          # Python (LangChain + Chroma)
│   └─ email-worker/       # Node (BullMQ) or Python (Celery)
├─ infra/
│   ├─ docker-compose.yml  # dev (Postgres, Redis, Chroma, MinIO)
│   └─ k8s/                # Helm charts for prod
├─ docs/
│   └─ tech-stack.md       # <-- this file
└─ .github/
    └─ workflows/          # CI/CD pipelines
```

---

## 6. Development & Deployment Checklist

### Local Development
```bash
# 1️⃣ Start infrastructure
docker compose up -d postgres redis chroma minio

# 2️⃣ Start API (choose Node or Django)
cd packages/api
# Node
npm install && npm run dev
# OR
# Django
pip install -r requirements.txt
python manage.py runserver

# 3️⃣ Start web
cd ../web
npm install && npm run dev

# 4️⃣ Start workers
cd ../email-worker
npm install && npm start
cd ../ai-worker
pip install -r requirements.txt
python worker.py
```

### CI
- Lint + unit tests on PR.
- Build multi‑stage Docker images (`api`, `web`, `email-worker`, `ai-worker`).
- Push to registry; deploy to staging via Helm (`helm upgrade --install ticket-system ./infra/k8s`).

### Production
- Managed Postgres (AWS Aurora / Cloud SQL).
- Redis Elasticache for BullMQ/Celery broker.
- S3‑compatible bucket (AWS S3 / MinIO) for attachments.
- Auth0 (or Cognito) for SSO/MFA – identity stored in `users` table; sessions still in PostgreSQL.
- Autoscaling policies based on queue length (email worker) and request latency (API).

### Observability
- Export Prometheus metrics from each service (request latency, queue depth).
- Ship logs to Loki; set alerts on error spikes.
- Use Sentry for frontend error tracking.

---

## 7. Next Steps
1. **Prototype email‑to‑ticket flow** (IMAP worker → DB → simple auto‑reply).  
2. **Set up Chroma** with a seed knowledge base; test a Retrieval‑Augmented Generation call with OpenAI.  
3. **Build ticket list/detail UI** hooked to a mock API, then swap in the real API.  
4. **Implement database‑session authentication** (express‑session/connect‑pg‑simple or Django sessions).  
5. **Add role‑based routes** (`/agents` protected to `admin`) and test admin‑creates‑agent flow.  
6. **Configure CI/CD and monitoring** for confident promotion to staging/production.

Feel free to ask for deeper dives—sample code for the email worker, a LangChain RAG prompt, or a ready‑to‑use Docker‑Compose file. Happy building!