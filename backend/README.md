# AcademiTrack — Backend API Server

The backend server is an Express.js API built with ES modules, connected to Supabase PostgreSQL for persistent data storage and authentication, and Google Gemini for AI-driven academic analysis.

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start development server
npm run dev

# 4. Run test suite
npm test
```

## API Endpoints

### Health Check
- `GET /health` — Server status, environment, and uptime.

### Authentication & Profile (`/api/auth`)
- `GET /api/auth/me` — Get current student profile.
- `PUT /api/auth/profile` — Update display name, institution, and target goals.

### Subjects (`/api/subjects`)
- `GET /api/subjects` — List enrolled subjects with weighted scores.
- `POST /api/subjects` — Create a new subject with unique name constraint.
- `GET /api/subjects/:id` — Get subject details with test history.
- `PUT /api/subjects/:id` — Update subject metadata or target percentage.
- `DELETE /api/subjects/:id` — Delete subject (cascades to assessments).

### Assessments (`/api/assessments`)
- `GET /api/assessments` — Filter assessments by subject, type, date range; sort by score or date.
- `POST /api/assessments` — Record test marks (verifies subject ownership and `marks <= max`).
- `GET /api/assessments/:id` — Get single assessment record.
- `PUT /api/assessments/:id` — Update marks or remarks.
- `DELETE /api/assessments/:id` — Delete assessment.

### Academic Analytics (`/api/analytics`)
- `GET /api/analytics/dashboard` — Aggregated metrics: weighted overall %, average per subject, best subject, attention subject, trajectory trend.
- `GET /api/analytics/progress` — Chronological timeline points and category breakdowns for Recharts.

### AI Advisor (`/api/ai-advisor`)
- `GET /api/ai-advisor/status` — Returns AI advisor availability and active model.
- `POST /api/ai-advisor/analyze` — Generates structured diagnostics (strengths, areas for improvement, revision strategies) based on authentic student data.
- `POST /api/ai-advisor/study-plan` — Generates structured 7-day study plan.

### Study Plans (`/api/study-plans`)
- `GET /api/study-plans` — List student's study plans.
- `POST /api/study-plans` — Create or confirm an AI study plan.
- `PATCH /api/study-plans/:id/tasks/:taskId/toggle` — Toggle task completion.
- `DELETE /api/study-plans/:id` — Remove a study plan.

### Reports (`/api/reports`)
- `GET /api/reports/summary` — Performance summary filtered by date range.
- `GET /api/reports/export-csv` — Stream CSV file containing the authenticated student's verified records.
