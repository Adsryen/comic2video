# Frontend environment

## Required for local frontend startup

Create `platform/frontend/.env.local` from `platform/frontend/.env.example`.

Example:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Notes

- If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, the frontend now still loads, but authentication is disabled.
- `VITE_API_BASE_URL` defaults to `http://localhost:8000` if omitted.
- After editing env files, restart the frontend dev server.

## Quick start

```bash
cp platform/frontend/.env.example platform/frontend/.env.local
```

Then fill in your real Supabase values and start the app again.
