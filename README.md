# AI-Powered Ticket Management System

A ticket management system that uses AI to automatically classify, respond to, and route support emails.

## Features

- **Ticket Management**: Create, view, update, and delete tickets
- **AI-Powered Features**:
  - Automatic ticket classification
  - AI-generated responses
  - Ticket summarization
  - Smart routing suggestions
- **User Management** (Admin-only):
  - Create new support agents
  - View and manage users
- **Ticket List**:
  - Filter by status, category, assignee
  - Sort by various fields
  - Search functionality
- **Ticket Detail View**:
  - Full ticket details
  - Conversation history
  - AI-suggested responses
- **Authentication**:
  - Email/password login
  - Session management
  - Protected routes
- **Responsive Design**: Works on desktop and mobile devices

## Ticket Creation Feature

The ticket creation feature allows users and support agents to create new support tickets through a modal form.

### How to Use

1. **Access the Ticket Creation Form**:
   - Click the "New Ticket" button in the top-right corner of the Tickets page
   - A modal form will appear

2. **Fill Out the Form**:
   - **Subject** (required): Brief description of the issue (minimum 3 characters)
   - **Body** (optional): Detailed description of the issue
   - **Sender Name** (required): Name of the person submitting the ticket
   - **Sender Email** (required): Valid email address of the sender
   - **Category** (optional): Select from General Question, Technical Question, or Refund Request
   - **Status** (required): Select the initial status (default is "Open")

3. **Submit the Ticket**:
   - Click the "Create Ticket" button
   - The form will validate all fields before submission
   - Upon successful submission:
     - The modal will close
     - The ticket list will automatically refresh to show the new ticket
     - A success toast notification will appear

4. **Validation**:
   - All required fields must be filled
   - Email must be in valid format
   - Subject must be at least 3 characters
   - Error messages will appear below invalid fields

### API Endpoint

The ticket creation form submits to the backend API endpoint:

```
POST /api/tickets
```

With JSON payload:
```json
{
  "subject": "string",
  "body": "string (optional)",
  "senderName": "string",
  "senderEmail": "string (email format)",
  "category": "GENERAL_QUESTION | TECHNICAL_QUESTION | REFUND_REQUEST (optional)",
  "status": "OPEN | IN_PROGRESS | RESOLVED | CLOSED (defaults to OPEN)"
}
```

## Technology Stack

- **Frontend**:
  - React with TypeScript
  - Vite for fast development builds
  - React Query (TanStack Query) for data fetching and caching
  - React Hook Form with Zod for form validation
  - Tailwind CSS for styling
  - Headless UI for accessible components

- **Backend**:
  - Express.js with TypeScript
  - Bun runtime for fast execution
  - PostgreSQL database with Prisma ORM
  - Better Auth for authentication (email/password providers)
  - Zod for request validation

- **DevOps**:
  - Docker Compose for local development
  - GitHub Actions for CI/CD

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/) (for caching and job queues)
- [MinIO](https://min.io/) (for file storage, optional for basic functionality)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd help-desk
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both `client/` and `server/` directories
   - Fill in the required values (database URL, auth secrets, etc.)

4. Start the required services:
   ```bash
   docker compose up -d
   ```

5. Apply database migrations:
   ```bash
   bun run --workspace server prisma:migrate
   ```

6. Start the development servers:
   ```bash
   # In one terminal
   bun run --workspace server dev
   
   # In another terminal
   bun run --workspace client dev
   ```

7. Open your browser to `http://localhost:5173`

## Project Structure

```
help-desk/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── api.ts          # API service layer
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components (including TicketsPage.tsx)
│   │   ├── lib/            # Utility libraries
│   │   ├── types/          # TypeScript type definitions
│   │   └── test/           # Test utilities
│   └── vite.config.ts      # Vite configuration
├── server/                 # Backend Express application
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Custom middleware
│   │   ├── routes/         # API route definitions
│   │   ├── utils/          # Utility functions
│   │   └── prisma/         # Prisma client and models
│   └── tsconfig.json       # TypeScript configuration
├── docker-compose.yml      # Docker services configuration
└── README.md               # This file
```

## Testing

### Frontend Tests

Run frontend tests with Vitest and React Testing Library:

```bash
# From the client directory
bun run test
bun run test:ui          # Open test UI
bun run test:coverage    # Generate coverage report
```

### Backend Tests

Backend tests follow similar patterns using Vitest for unit and integration tests.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.