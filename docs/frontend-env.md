# Frontend environment

## Required for local frontend startup

Create `platform/frontend/.env.local` from `platform/frontend/.env.example`.

Example:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_DEMO_MODE=false
VITE_GOOGLE_AUTH_ENABLED=false
```

## Notes

- `VITE_API_BASE_URL` defaults to `http://localhost:8000` for localhost development if omitted.
- `VITE_GOOGLE_AUTH_ENABLED` is optional and is currently optional and defaults to false while Google login is deferred.
- After editing env files, restart the frontend dev server.

## Quick start

```bash
cp platform/frontend/.env.example platform/frontend/.env.local
```

Then set your API base URL and start the app again.
