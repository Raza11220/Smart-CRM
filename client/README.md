# SmartCRM Frontend Client

Modern, responsive Single Page Application (SPA) built with React 19, TypeScript, and Vite. Designed to operate seamlessly either connected to the production Express/MongoDB API or in an isolated client-side demo mode.

---

## 🛠️ Technology Stack

- **Framework**: React 19 (Strict Mode)
- **Language**: TypeScript (Strict Mode)
- **Build Tool**: Vite 6 / 8
- **Styling**: Tailwind CSS v4, Base UI primitives, and Lucide Icons
- **State Management**:
  - Server state: TanStack Query (React Query)
  - UI / Session state: Zustand
- **Forms & Validation**: React Hook Form with Zod schemas
- **Drag & Drop**: `@dnd-kit` (Core & Sortable)
- **Data Visualization**: Recharts
- **HTTP Client**: Axios with automatic JWT token refresh interceptors

---

## 📁 Architecture & Directory Structure

```
client/src/
├── app/                  # Application bootstrap, routing, and main layout shells
├── assets/               # Static assets, branding, and icons
├── components/           # Reusable UI design system (buttons, dialogs, tables, drawers)
├── data/                 # Static fallback definitions and fixtures
├── features/             # Modular feature domains:
│   ├── auth/             # Login, register, forgot-password, session restore
│   ├── customers/        # Customer directory, contact cards, interaction logs
│   ├── dashboard/        # KPI metrics, revenue charts, upcoming tasks, activity feed
│   ├── pipeline/         # Interactive drag-and-drop Deal Kanban board & drawer
│   ├── profile/          # User profile, personal stats, and contact info
│   ├── reports/          # Filterable visual analytics (revenue, conversion, sources)
│   ├── settings/         # Profile, security, notifications, and regional preferences
│   ├── tasks/            # Task list, Kanban view, and status updates
│   └── team/             # Team management, role assignment, and employee profiles
├── hooks/                # Custom React hooks (analytics, theme, mobile viewports)
├── lib/                  # Helper utilities, localization, formatting, and DTO adapters
├── services/             # Networking and data layer:
│   ├── api/              # Axios instance, token interceptor, CSRF headers
│   └── repositories/     # Data repository adapters (API vs. In-Browser Demo)
├── store/                # Zustand global stores (authStore, uiStore, preferenceStore)
└── types/                # Central TypeScript definitions and entity contracts
```

---

## ⚙️ Configuration & Modes

The frontend dynamically adjusts based on `.env` configuration:

```env
# Point to backend API
VITE_API_BASE_URL=http://localhost:5000/api

# Operation Mode: 'api' (Default) or 'demo'
VITE_DATA_MODE=api
```

- **`api` Mode**:
  - Connects to the Express/MongoDB server.
  - JWT access tokens are kept safely in memory.
  - Refresh tokens are maintained in secure HttpOnly cookies.
  - All mutations, Kanban stage updates, and assignments persist to MongoDB.
- **`demo` Mode**:
  - Completely isolated in-browser operation utilizing `localStorage`.
  - Ideal for quick UI demos, offline exploration, and design reviews.

---

## 🚀 Available Scripts

In the `client` directory:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite development server at `http://localhost:5173` |
| `npm run build` | Runs TypeScript compilation (`tsc -b`) and generates production bundle in `dist/` |
| `npm run preview` | Serves production build locally |
| `npm run lint` | Runs ESLint across all TypeScript and React files |

---

## 🔐 Security & Interceptors

- **Memory-Only Access Tokens**: Access tokens are held exclusively in memory and never stored in `localStorage` or `sessionStorage`.
- **Atomic Refresh Rotation**: When an API request encounters a `401 Unauthorized`, Axios halts queued requests, calls `/api/auth/refresh`, updates the in-memory token, and replays the original request automatically.
- **CSRF Defense**: Every authenticated mutation carries the custom header `X-SmartCRM-Request: 1`, mitigating cross-site request forgery attacks.
