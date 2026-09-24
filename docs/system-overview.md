# System overview

The UI uses React 19, TypeScript, Vite, Tailwind CSS utilities, and reusable sidebar/header/table components. `App.tsx` selects the dashboard or management/report page. Demo records are in `src/data/demoData.ts`; Oracle DDL and PL/SQL are under `database/oracle`.

The shared app exposes demo role routes at `/admin`, `/passenger`, and `/driver`. The Express API is under `backend/server`; `oracleAdapter.ts` and `mongodbAdapter.ts` are optional adapters selected by environment configuration. When credentials are absent or a health check fails, the API uses the in-memory adapter and reports Demo Mode.
