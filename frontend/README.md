# AcademiTrack — Frontend Web Application

The frontend is a single-page application built with React 18, Vite, and Tailwind CSS. It communicates with the Express backend using Supabase Auth JWT Bearer tokens.

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your backend URL and Supabase public keys

# 3. Start development server
npm run dev

# 4. Build production bundle
npm run build
```

## Application Routes

- `/login` — Email & password sign in with session restoration.
- `/register` — Account registration with validation.
- `/forgot-password` — Password reset request.
- `/dashboard` — High-level academic overview with cards, charts, and quick actions.
- `/subjects` — Course cards, target progress bars, and modal management.
- `/subjects/:subjectId` — Single subject detail with assessment history and statistics.
- `/assessments` — Comprehensive assessment table with filtering, search, and sorting.
- `/progress` — Chronological timeline graphs (Recharts) and category breakdowns.
- `/ai-advisor` — AI performance diagnostic, weak topic analysis, and study plan generator.
- `/reports` — Academic transcripts with date filters and CSV export.
- `/profile` — Student profile and goal configuration.
- `/settings` — Application preferences and calculation explanations.
