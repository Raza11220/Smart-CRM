# SmartCRM — Modern Sales & CRM Management System

A production-grade, enterprise-ready MERN Stack (MongoDB, Express 5, React 19, Node.js) Customer Relationship Management platform. Designed with strict TypeScript architecture, robust role-based security, atomic transactional pipelines, and localized business features for Pakistani and global commerce.

---

## 🌟 Key Features

- **End-to-End Enterprise Architecture**:
  - **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Base UI / shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, and Recharts.
  - **Backend**: Express 5, Node.js LTS, strict TypeScript, Mongoose, and MongoDB Replica Set / Atlas with multi-document ACID transactions.
- **Security & Session Management**:
  - JWT Access Tokens (kept securely in memory) + HttpOnly Refresh Cookies with SHA-256 database hashes.
  - Automatic refresh token rotation, replay detection, and family-wide revocation.
  - CSRF mitigation via custom headers (`X-SmartCRM-Request: 1`) and strict allowlisted CORS origins.
  - Brute-force protection with rate-limiting, Helmet security headers, and bcrypt password hashing (cost 12).
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full organization management, team oversight, role assignment, system-wide analytics, and record deletion. Protected last-admin safeguard prevents accidental administrative lockout.
  - **Staff**: Dedicated workspace scoped strictly to assigned customers, leads, deals, and tasks with private performance metrics.
- **Core CRM Modules**:
  - **Customer Management**: Contact records, communication history, linked deals, and tasks.
  - **Leads & Opportunities**: Qualification stages, lead sources, and follow-up tracking.
  - **Visual Sales Pipeline**: Interactive Kanban board powered by `@dnd-kit` with atomic stage transitions, synchronized close dates (`closedAt`), and pipeline metrics.
  - **Task Management**: Prioritized to-do boards, assignment tracking, due dates, and completion timestamps.
  - **Team Directory**: Employee onboarding, department assignment, and quota/performance tracking.
  - **Real-Time Analytics & Reports**: Live MongoDB aggregation for revenue curves, win/loss rates, lead conversion rates, and employee leaderboards.
  - **Audit Logs & Notifications**: In-app notifications and event streams tracking user assignments and milestone events.
- **Pakistani Business Localization**:
  - Currency: Pakistani Rupee (**PKR / Rs.** formatted with `en-PK`).
  - Timezone: `Asia/Karachi` calendar midnight calculation for accurate daily revenue analytics.
  - Realistic synthetic Pakistani demo dataset for instant onboarding.

---

## 🏗️ Project Architecture

```
smart-crm/
├── client/                     # React Frontend Application
│   ├── src/
│   │   ├── app/                # Router, providers, and layout shells
│   │   ├── components/         # Reusable UI primitives and shared components
│   │   ├── features/           # Feature modules (customers, leads, pipeline, tasks, etc.)
│   │   ├── services/           # Axios HTTP client, API adapters, and repositories
│   │   └── store/              # Zustand state stores
│   ├── .env                    # Frontend environment configuration
│   └── package.json
│
├── server/                     # Express & Mongoose API Server
│   ├── src/
│   │   ├── config/             # Database connection, env validation
│   │   ├── controllers/        # Request handlers (auth, CRM records, analytics)
│   │   ├── middleware/         # JWT auth, RBAC, CSRF, and validation middleware
│   │   ├── models/             # Mongoose schemas (User, Customer, Lead, Deal, Task, Events)
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── services/           # Core business logic and database operations
│   │   ├── utils/              # Response formats, DTO serialization, date utilities
│   │   └── validators/         # Strict Zod schemas for input validation
│   ├── docs/                   # OpenAPI 3.1 specifications (openapi.json)
│   ├── scripts/                # Database dev runner and fixture seed scripts
│   ├── .env                    # Private server secrets and credentials
│   └── package.json
│
└── README.md                   # Workspace root overview
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20+ LTS or v22+
- **MongoDB**: Local MongoDB instance (configured as a replica set) or MongoDB Atlas connection string.

---

### Step 1: Environment Setup

1. **Server Configuration**:
   Navigate to `server` and copy the example environment file if `.env` is not already present:
   ```powershell
   cd d:\smart-crm\server
   cp .env.example .env
   ```
   *Note: Ensure `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SEED_ADMIN_PASSWORD`, and `SEED_STAFF_PASSWORD` are configured.*

2. **Client Configuration**:
   Ensure `client/.env` has:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_DATA_MODE=api
   ```
   *(Set `VITE_DATA_MODE=demo` if you wish to run isolated in-browser demo mode without a backend).*

---

### Step 2: Running Locally

Run the following processes across separate terminal windows:

#### Terminal 1 — Start MongoDB (Isolated Dev Replica Set)
```powershell
cd d:\smart-crm\server
npm run db:dev
```
*(Starts an isolated loopback MongoDB replica set on port 27018).*

#### Terminal 2 — Seed Database & Start API Server
```powershell
cd d:\smart-crm\server
npm run seed     # Idempotent Pakistani dataset seeding
npm run dev      # Starts Express API on http://localhost:5000/api
```

#### Terminal 3 — Start Frontend Client
```powershell
cd d:\smart-crm\client
npm run dev      # Starts Vite React client on http://localhost:5173
```

---

## 🔑 Default Seed Credentials

After running `npm run seed`, access the system with:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@smartcrm.example` | Value from `SEED_ADMIN_PASSWORD` in `server/.env` |
| **Staff** | `staff@smartcrm.example` | Value from `SEED_STAFF_PASSWORD` in `server/.env` |

---

## 📡 API Documentation & Contracts

- Comprehensive OpenAPI 3.1 specifications are located at:
  [`server/docs/openapi.json`](file:///d:/smart-crm/server/docs/openapi.json)
- Import `openapi.json` into Swagger Editor, Postman, or Insomnia to explore endpoints, schemas, role permissions, and request/response examples.
- Health Check: `GET /api/health` returns server status and database connectivity readiness.

---

## 🧪 Testing & Validation

Run quality checks across both subprojects:

```powershell
# Typecheck & Build Client
cd d:\smart-crm\client
npm run build

# Typecheck & Build Server
cd d:\smart-crm\server
npm run typecheck
npm run build

# Execute Backend Integration Tests
npm test
```

---

## 📄 License
This project is proprietary and confidential. Developed for enterprise sales management.
