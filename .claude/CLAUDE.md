# CarMatch — Troque seu carro

## Project Overview
CarMatch is a car swapping platform where users post their cars and specify what they'd like in exchange. The matching engine finds reciprocal matches, and built-in chat lets users negotiate. **Deployed on Google Cloud Run, in São Paulo (southamerica-east1).**

## Tech Stack
- **Next.js 16** — App Router, React 19, standalone output for Docker
- **TypeScript** — strict mode
- **TailwindCSS v4** — CSS-first config (no tailwind.config file)
- **JSON file database** — `data/*.json` (read/written via `lib/db.ts`, persisted in GCS via gcsfuse)
- **Local filesystem for images** — `public/uploads/` (mounted from GCS bucket in production)
- **Google Cloud Platform** — Cloud Run (serverless), Cloud Storage (data + images), Artifact Registry (Docker images)
- **Google OAuth** — replaced the old name+email login

## Authentication
- Google OAuth 2.0 (Authorization Code flow — manual implementation, no NextAuth.js)
- Session stored in `httpOnly` cookie named `carmatch-session` (plain JSON, no signing — v0)
- Dev fallback: `POST /api/auth/login` with `{ name, email }` still exists (not exposed in UI)
- User type has: `id, name, email, provider, avatar?, createdAt`

## Project Structure
- `app/` — Next.js App Router (pages + API routes)
- `components/` — Client components (Navbar, PostCard, ChatWidget, etc.)
- `lib/` — Shared logic (auth, db, matching, chat, oauth, FIPE API)
- `data/` — JSON files (users, posts, matches, conversations, messages)
- `public/uploads/` — Uploaded images
- `scripts/seed.ts` — Seed script with mock data

## Deployment

### First-time setup (Google Cloud Run + gcsfuse)
1. Enable APIs: `run.googleapis.com`, `artifactregistry.googleapis.com`, `cloudbuild.googleapis.com`
2. Create GCS buckets: `carmatch-data-499019` (private, for JSON files) and `carmatch-uploads-499019` (public-read, for images)
3. Initialise data: `gcloud storage cp data/*.json gs://carmatch-data-499019/`
4. Copy existing uploads: `gcloud storage cp public/uploads/*.jpg gs://carmatch-uploads-499019/`
5. Grant compute SA access: `roles/storage.objectAdmin` on both buckets
6. Create Artifact Registry: `gcloud artifacts repositories create carmatch-app --repository-format docker --location southamerica-east1`
7. Deploy: `gcloud run deploy carmatch --source . --region southamerica-east1 --execution-environment gen2 --add-volume "name=data,type=cloud-storage,bucket=carmatch-data-499019" --add-volume-mount "volume=data,mount-path=/app/data" --add-volume "name=uploads,type=cloud-storage,bucket=carmatch-uploads-499019" --add-volume-mount "volume=uploads,mount-path=/app/public/uploads" --allow-unauthenticated --min-instances 0 --max-instances 1`

### Setting up Google OAuth
1. Create credentials at [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Add redirect URIs:
   - `http://localhost:3000/api/auth/oauth/google/callback`
   - `https://carmatch-404714657867.southamerica-east1.run.app/api/auth/oauth/google/callback`
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`
4. Set them on Cloud Run: `gcloud run services update carmatch --region southamerica-east1 --update-env-vars "GOOGLE_CLIENT_ID=...,GOOGLE_CLIENT_SECRET=..."`

### Redeploy after changes
```bash
gcloud run deploy carmatch --source . --region southamerica-east1
```

This detects the Dockerfile, builds the image with Cloud Build, pushes to Artifact Registry, and deploys to Cloud Run — keeping the same volume mounts and env vars.

### Useful commands
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=carmatch" --limit 20

# Update env vars
gcloud run services update carmatch --region southamerica-east1 --update-env-vars KEY=VALUE

# Scale config
gcloud run deploy carmatch --region southamerica-east1 --min-instances 0 --max-instances 1

# Rollback to previous revision
gcloud run deploy carmatch --region southamerica-east1 --image <previous-image-tag>
```

## Important Notes
- **`lib/db.ts`** uses synchronous `fs.readFileSync` / `fs.writeFileSync` — fine for v0 but has race conditions under concurrent writes
- **No middleware** — API routes guard themselves individually via `getCurrentUser()`
- **No migration** — JSON files are the schema; add fields by hand
- **Chat uses 5s polling** — `setInterval` in ChatWidget, no WebSocket
- **Cookie auth** — `carmatch-session` cookie stores `{ userId, name }` as plain JSON, not signed (v0 trade-off)

## Permissiveness
Claude Code has full freedom to execute any bash command, read/write any file, install dependencies, and modify the project as needed.