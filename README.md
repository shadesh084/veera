# AcademiTrack — AI-Powered Student Progress Tracker

AcademiTrack is a production-ready, full-stack academic performance tracking platform designed for students in school, college, and university. It allows students to manage enrolled subjects, log assessment scores, visualize progress trends over time, and receive personalized AI-generated study recommendations powered by Google Gemini.

---

## 🌟 Key Features

### 1. 🔐 Secure Authentication & Data Isolation
- Powered by **Supabase Auth** with email and password registration, login, and password recovery.
- Strict **Row-Level Security (RLS)** in PostgreSQL ensures students can only read and modify their own academic records.
- Backend verifies Supabase JWT access tokens on every request rather than trusting client-supplied user IDs.

### 2. 📊 Academic Analytics & Weighted Calculations
- Computes **marks-weighted percentages** rather than simplistic unweighted averages:
  $$\text{Subject Weighted Percentage} = \left(\frac{\sum \text{Marks Obtained}}{\sum \text{Maximum Possible Marks}}\right) \times 100$$
  $$\text{Overall Weighted Percentage} = \left(\frac{\sum_{\text{all}} \text{Marks Obtained}}{\sum_{\text{all}} \text{Maximum Possible Marks}}\right) \times 100$$
- Performance band classification:
  - **Excellent**: 90% – 100% (A+)
  - **Good**: 75% – 89.99% (A)
  - **Satisfactory**: 60% – 74.99% (B)
  - **Needs Improvement**: 40% – 59.99% (C)
  - **Critical Review**: Below 40% (D/F)
- Automated historical trend detection comparing recent vs earlier assessment scores.
- Zero-division protection and graceful null-state handling for new accounts with no recorded marks.

### 3. 📚 Course & Subject Management
- Create, view, edit, and delete subjects with custom color tags, course codes, and target score goals.
- Duplicate subject prevention per student (case-insensitive and whitespace-normalized).
- Cascading deletion warning ensuring user confirmation before deleting associated assessments.

### 4. 📝 Assessments & Marks Tracker
- Record grades for quizzes, assignments, unit tests, midterms, finals, practicals, and projects.
- Server-side validation enforcing non-negative marks, strictly positive maximum marks, and `marks_obtained <= max_marks`.
- Cross-tenant validation trigger preventing assessments from referencing subjects belonging to other students.
- Search, filter by subject, filter by assessment type, filter by date range, and sort by date or score.

### 5. 🤖 AI-Powered Academic Advisor
- Powered by the official **Google Gen AI SDK (`@google/genai`)** using `gemini-2.5-flash`.
- Analyzes authentic student marks from the backend database (never accepts client-supplied scores as truth).
- Generates actionable diagnostics: strengths, priority attention areas, recommended revision strategies, and specific weekly study plans.
- Requires **explicit student confirmation** before persisting any AI-generated study schedule.
- Resilient fallback engine provides deterministic guidance when an external API key is not yet configured.

### 6. 📑 Reports & CSV Export
- Comprehensive performance report filtered by date ranges.
- One-click CSV export streaming only the authenticated student's data with complete calculation details.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Recharts, Lucide React, Zod |
| **Backend** | Node.js, Express.js (ES modules), `@google/genai`, Supabase SDK, Helmet, CORS, Express-Rate-Limit, Zod |
| **Database & Auth** | Supabase PostgreSQL, Row-Level Security (RLS), PL/pgSQL Triggers, UUIDs |
| **Testing** | Vitest, Supertest (30/30 unit & integration tests passing) |

---

## 📁 Repository Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Environment loader, Supabase client, Gemini AI config
│   │   ├── controllers/     # Route controllers (auth, subjects, assessments, analytics, etc.)
│   │   ├── middleware/      # Supabase JWT auth verification, Zod validator, error handler
│   │   ├── routes/          # Express route declarations
│   │   ├── schemas/         # Zod validation schemas for all entities
│   │   ├── services/        # Data access layer & in-memory dev fallback
│   │   ├── utils/           # Shared academic calculation engine & structured logger
│   │   ├── app.js           # Express application configuration
│   │   └── index.js         # HTTP server entry point
│   ├── tests/               # Vitest test suites (calculations, validation, API)
│   ├── .env.example         # Backend environment template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Common UI components (Layout, Sidebar, Navbar, Modal, etc.)
│   │   ├── config/          # Supabase client & API base URL config
│   │   ├── context/         # AuthContext (sessions, profile) & ToastContext
│   │   ├── pages/           # Dashboard, Subjects, SubjectDetail, Assessments, Progress, AIAdvisor, Reports, Profile, Settings
│   │   ├── services/        # Frontend API services with auto-token injection
│   │   ├── App.jsx          # Route declarations & route guards
│   │   ├── index.css        # Tailwind styling & glassmorphism utilities
│   │   └── main.jsx         # React application entry point
│   ├── .env.example         # Frontend environment template
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Complete PostgreSQL schema, constraints, triggers & RLS
│
└── package.json             # Root monorepo scripts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v20.x or higher
- **npm** v10.x or higher
- (Optional) A free [Supabase](https://supabase.com) project for PostgreSQL database & Auth
- (Optional) A free [Google AI Studio](https://aistudio.google.com) API key for live Gemini 2.5 advisory

---

### Step 1: Database Setup (Supabase)

1. Create a new project in your [Supabase Dashboard](https://supabase.com).
2. Navigate to the **SQL Editor** in the left sidebar.
3. Open [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
4. Copy the entire file content, paste it into the Supabase SQL Editor, and click **Run**.
5. The migration will automatically create:
   - `public.profiles` with signup auto-provisioning trigger
   - `public.subjects` with case-insensitive unique constraints
   - `public.assessments` with cross-tenant ownership triggers
   - `public.study_plans` with JSONB tasks validation
   - Row-Level Security (RLS) policies for all 4 tables
   - `updated_at` automated trigger functions

---

### Step 2: Backend Configuration & Startup

1. Open `backend/.env.example` and create `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Fill in your environment variables:
   ```ini
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # From your Supabase Project Settings -> API
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

   # From Google AI Studio (optional, fallback available)
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. Install dependencies and start the backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *The backend API server will start on `http://localhost:5000`.*

---

### Step 3: Frontend Configuration & Startup

1. Open `frontend/.env.example` and create `frontend/.env`:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
2. Fill in the frontend configuration:
   ```ini
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
3. Install dependencies and start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The frontend application will be live at `http://localhost:5173`.*

> **💡 Quick Dev / Demo Mode:**  
> If you start the app without configuring Supabase or Gemini credentials, the platform automatically enables **Local Workspace Mode**. You can click **"Explore Demo Workspace Instantly"** on the login page to immediately test and explore the full platform with realistic subjects, assessments, charts, and rule-based academic advisory.

---

## 🧪 Running Tests

The test suite covers academic calculation algorithms, marks-weighted formulas, edge cases (zero division, boundary conditions), Zod validation schemas, and Express API endpoints.

To run tests:
```bash
cd backend
npm test
```

Result:
```
✓ tests/calculations.test.js (13 tests)
✓ tests/validation.test.js (10 tests)
✓ tests/api.test.js (7 tests)

Test Files  3 passed (3)
     Tests  30 passed (30)
```

---

## 🔒 Security Architecture

1. **Token Verification**: Every protected backend route checks the Supabase JWT Bearer token using `supabaseAdmin.auth.getUser(token)`. Client-supplied user IDs in request bodies or query parameters are never trusted.
2. **Row-Level Security (RLS)**: Enforced directly at the PostgreSQL layer. Anonymous access is revoked, and authenticated users can only query rows where `auth.uid() = user_id`.
3. **Cross-Tenant Constraint Trigger**: A database trigger verifies that the `subject_id` referenced by an assessment belongs to the same `user_id` as the assessment, preventing cross-tenant data tampering.
4. **Input Sanitization**: All incoming request bodies and query parameters pass through strict Zod schemas before reaching business logic.
5. **Rate Limiting & Security Headers**: Express is protected by `helmet` security headers, strict CORS origin controls, and `express-rate-limit` (300 requests / 15 minutes).

---

## 📄 License
This project is licensed under the MIT License.
