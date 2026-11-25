# SmartCRM API Server

High-performance, secure REST API server powering SmartCRM. Built with Express 5, strict TypeScript, Mongoose, and MongoDB. Engineered with strict input validation, multi-document ACID transactions, enterprise-grade session lifecycle management, and full Pakistani business localization.

---

## 🛠️ Technology Stack

- **Runtime & Language**: Node.js LTS, TypeScript (Strict Mode)
- **Framework**: Express 5
- **Database & ODM**: MongoDB (Replica Set / Atlas) with Mongoose
- **Authentication**: JWT (JSON Web Tokens), `bcryptjs`, and HttpOnly Cookies
- **Input Validation**: Zod with strict type coercion and sanitization
- **Security**: Helmet, CORS allowlists, Express Rate Limit, CSRF mitigation
- **Testing**: Vitest, Supertest
- **Documentation**: OpenAPI 3.1 specification

---

## 📁 Architecture & Directory Structure

```
server/src/
├── app.ts                # Express application setup, security middleware, routing
├── server.ts             # Process lifecycle, port listener, graceful shutdown
├── config/
│   ├── db.ts             # MongoDB replica set connection & index synchronization
│   └── env.ts            # Runtime environment validation via Zod
├── controllers/          # HTTP request handlers:
│   ├── auth.controller.ts       # Register, login, refresh, logout, profile
│   ├── record.controller.ts     # Generic CRUD for Customers, Leads, Deals, Tasks
│   ├── user.controller.ts       # Team management, role assignment, performance
│   ├── event.controller.ts      # Activity feed and in-app notifications
│   └── analytics.controller.ts  # Dashboard and reporting aggregation
├── middleware/
│   ├── auth.middleware.ts       # JWT verification, RBAC guard, CSRF validation
│   └── error.middleware.ts      # Centralized error handler & status mapper
├── models/
│   ├── User.model.ts            # User credentials, roles, notification settings
│   ├── crm.models.ts            # Customer, Lead, Deal, Task schemas & indexes
│   └── events.models.ts         # Activity, Notification, RefreshSession, WorkspaceLock
├── routes/
│   └── index.ts                 # Central REST router with rate-limiters & validators
├── services/
│   ├── auth.service.ts          # Session management, token generation, password hashing
│   ├── record.service.ts        # Business logic, relationship synchronization, cascade guards
│   ├── user.service.ts          # Employee administration and quota calculations
│   ├── analytics.service.ts     # MongoDB aggregation pipelines for metrics
│   └── transaction.ts           # WorkspaceLock transactional mutation wrapper
├── utils/
│   ├── dates.ts                 # Karachi timezone calendar calculations
│   ├── dto.ts                   # DTO sanitization (strips hashes and internal fields)
│   └── http.ts                  # Standardized response formatters & Zod middleware
└── validators/
    └── schemas.ts               # Reusable Zod validation schemas
```

---

## ⚙️ Environment Variables

Create `.env` based on `.env.example`:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | API Server listening port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection URI (must support replica sets) | `mongodb://127.0.0.1:27018/smartcrm?replicaSet=smartcrm-dev` |
| `CLIENT_URL` | Allowlisted frontend origins (comma-separated) | `http://localhost:5173,http://127.0.0.1:5173` |
| `JWT_ACCESS_SECRET` | Secret key for access token signing | *(Min 48 chars random string)* |
| `JWT_REFRESH_SECRET` | Secret key for refresh token signing | *(Min 48 chars random string)* |
| `JWT_ACCESS_EXPIRES_IN` | Lifetime of access tokens | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Lifetime of refresh tokens | `7d` |
| `COOKIE_SAME_SITE` | SameSite cookie policy | `lax` (dev) or `none` (cross-site HTTPS) |
| `SEED_ADMIN_PASSWORD` | Password assigned to seeded Admin account | *(Min 12 chars)* |
| `SEED_STAFF_PASSWORD` | Password assigned to seeded Staff account | *(Min 12 chars)* |

---

## 🛡️ Security & Business Logic Highlights

1. **Token Rotation & Replay Protection**:
   - Refresh tokens are hashed using SHA-256 before storage in MongoDB.
   - Using a previously rotated refresh token automatically invalidates the entire token family, forcing re-authentication and defending against token theft.
2. **Transactional Consistency (`WorkspaceLock`)**:
   - Deals, leads, customers, and task creations run in ACID transactions.
   - Changing a Deal to `Won` or `Lost` updates `closedAt` atomically; moving to an open stage clears it.
   - Deletion of records with active relationships (e.g., customers with active deals) is prevented to prevent orphan data.
3. **Role-Based Access Control (RBAC)**:
   - Staff members are strictly constrained to records assigned to their user ID.
   - Admin accounts hold organization-wide oversight. The system prohibits deleting or deactivating the last remaining active Admin.
4. **Pakistani Localization & Aggregation**:
   - Revenue aggregation calculates boundaries using `Asia/Karachi` standard time.
   - Zero-filled trend series ensure charts render clean timelines.

---

## 🚀 Available Scripts

In the `server` directory:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs API in development mode with `tsx watch` |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Executes the production build from `dist/` |
| `npm run typecheck` | Validates TypeScript schemas without emitting code |
| `npm run db:dev` | Spawns an isolated local MongoDB replica set on port 27018 |
| `npm run seed` | Idempotent seeding of Pakistani business demo records |
| `npm test` | Runs Vitest & Supertest integration suite on isolated test DB |
| `npm run docs:api` | Generates OpenAPI 3.1 specification at `docs/openapi.json` |

---

## 📖 API Documentation

The complete OpenAPI specification is accessible at:
[`docs/openapi.json`](file:///d:/smart-crm/server/docs/openapi.json)

Health endpoint:
```http
GET /api/health
```
Response:
```json
{
  "success": true,
  "message": "SmartCRM API is running"
}
```
*(Returns 503 if MongoDB connection is not established).*
