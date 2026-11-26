# MoneyVerse

**Learn Money by Managing Life & Business.**

MoneyVerse is a gamified financial literacy platform combining a 12-month Personal Finance Simulation, a 12-week Business Simulation (Café, Bakery, Clothing Store), an interactive Learning Hub with Quizzes & XP, a Top-10 Leaderboard, and a provider-independent AI Mentor foundation (ready for Phase 10 Gemini Enterprise integration).

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Lucide React, Recharts, Firebase Auth SDK
- **Backend:** Node.js 22, Express, Firebase Admin SDK, Cloud Firestore, `@google-cloud/storage`
- **Cloud & Deployment:** Google Cloud Run (multi-stage Docker container serving both `/api` and the Vite production SPA), Google Cloud Storage
- **AI Mentor:** Provider-independent read-only foundation (Gemini Enterprise integration planned for Phase 10)

---

## Project Structure

```text
moneyverse/
├── client/                  # React + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── components/      # Dashboard layout, Personal, Business, Leaderboard UI
│   │   ├── context/         # Firebase Authentication context
│   │   ├── lib/             # Firebase client & authenticated Axios helpers
│   │   └── pages/           # Landing, Auth, Dashboard, Simulations, Learning Hub, AI Mentor
│   ├── .env.example
│   └── package.json
├── server/                  # Node.js + Express API & Production Static Host
│   ├── content/             # Local fallback lessons.json (6 INR financial literacy lessons)
│   ├── src/
│   │   ├── config/          # Firebase Admin ADC initialization
│   │   ├── controllers/     # Express request handlers
│   │   ├── middleware/      # Firebase ID token verification
│   │   ├── routes/          # /health, /profile, /personal, /business, /mentor, /content, /leaderboard
│   │   ├── services/        # Simulation engines, GCS storage, quiz/XP, leaderboard, AI provider interface
│   │   ├── app.js           # Express app + production client/dist static serving
│   │   └── index.js         # Cloud Run PORT / 0.0.0.0 listener & graceful shutdown
│   ├── tests/               # Backend unit & Firestore integration tests
│   ├── .env.example
│   └── package.json
├── Dockerfile               # Multi-stage production container (Vite build + Express runtime)
├── .dockerignore
├── .gcloudignore
├── .gitignore
├── package.json
└── README.md
```

---

## Local Development

### 1. Environment Variables

Copy the example templates (never commit `.env` files or service account keys):

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

- **`client/.env` (public Firebase Web App config):**
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_APP_ID`
- **`server/.env` (local backend config):**
  - `PORT=5000`
  - `GCP_PROJECT_ID=<your-gcp-project-id>`
  - `GCS_BUCKET_NAME=<optional-gcs-bucket-name>` (omit or leave unset to use `server/content/lessons.json`)
  - Local Firebase Admin auth: either run `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json` pointing to a gitignored local key inside `server/`.

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Run Frontend & Backend

```bash
# Run both together
npm run dev

# Or in separate terminal tabs
npm run dev:server   # http://127.0.0.1:5000
npm run dev:client   # http://localhost:5173 (proxies /api -> http://127.0.0.1:5000)
```

### 4. Build & Test

```bash
# Build frontend production bundle (client/dist)
npm run build

# Run backend unit tests
npm --prefix server test
```

---

## API Overview

| Route Group | Endpoints | Auth |
| --- | --- | --- |
| **Health** | `GET /api/health` | Public (`{"status":"ok"}`) |
| **Profile** | `POST /api/profile/init`, `GET /api/profile` | Firebase ID Token |
| **Personal Finance** | `POST /api/personal/start`, `POST /api/personal/step`, `GET /api/personal/history` | Firebase ID Token |
| **Business Simulation** | `POST /api/business/start`, `POST /api/business/step`, `GET /api/business/history` | Firebase ID Token |
| **AI Mentor** | `GET /api/mentor/status`, `GET /api/mentor/runs`, `GET /api/mentor/runs/:runId`, `POST /api/mentor/request` | Firebase ID Token |
| **Learning Hub** | `GET /api/content/lessons`, `POST /api/content/quiz` | Firebase ID Token |
| **Leaderboard** | `GET /api/leaderboard` | Firebase ID Token |

---

## Production Deployment (Google Cloud Run)

MoneyVerse deploys as a single container on **Google Cloud Run**: the multi-stage root `Dockerfile` compiles the React/Vite SPA and serves both `/api/*` and the static frontend from Express on `0.0.0.0:$PORT`.

### 1. Required Google Cloud APIs

Enable these APIs in your GCP project before deploying:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  identitytoolkit.googleapis.com
```

### 2. Service Account & IAM Permissions (Application Default Credentials)

On Cloud Run, **do NOT upload or mount `serviceAccountKey.json`**. Firebase Admin and `@google-cloud/storage` automatically authenticate via Cloud Run's attached IAM service account (Application Default Credentials).

Grant the Cloud Run runtime service account:
- **Cloud Datastore User** (`roles/datastore.user`) — read/write Cloud Firestore (`users/{uid}`, runs, quiz progress, leaderboard)
- **Storage Object Viewer** (`roles/storage.objectViewer`) — read `lessons/lessons.json` from `GCS_BUCKET_NAME` (if using Cloud Storage)
- **Firebase Authentication Viewer** (`roles/firebaseauth.viewer`) — verify Firebase ID tokens

### 3. Production Environment Variables

#### Build-Time Arguments (Public Firebase Web App Config Only)
Passed only during `docker build` so Vite embeds public client config into `client/dist`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_BASE_URL=/api` (default; uses same-origin Express `/api`)

> **Never** pass service account keys, `GCS_BUCKET_NAME`, or Gemini API secrets as `VITE_*` build arguments.

#### Cloud Run Runtime Environment Variables
Configured on the Cloud Run service:
- `NODE_ENV=production`
- `GCP_PROJECT_ID=<your-gcp-project-id>`
- `GCS_BUCKET_NAME=<your-gcs-lessons-bucket>` *(optional; falls back to bundled `server/content/lessons.json` if omitted or object missing)*
- `PORT` is injected automatically by Cloud Run (`8080`).

### 4. Optional: Upload Lessons to Google Cloud Storage

```bash
gcloud storage cp server/content/lessons.json gs://<your-gcs-lessons-bucket>/lessons/lessons.json
```

### 5. Build Container & Deploy to Cloud Run

1. **Create an Artifact Registry repository** (one-time):
   ```bash
   gcloud artifacts repositories create moneyverse \
     --repository-format=docker \
     --location=asia-south1
   ```

2. **Build & push the image** (passing only public `VITE_*` build args):
   ```bash
   docker build \
     --build-arg VITE_FIREBASE_API_KEY=<firebase-web-api-key> \
     --build-arg VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com \
     --build-arg VITE_FIREBASE_PROJECT_ID=<project-id> \
     --build-arg VITE_FIREBASE_APP_ID=<firebase-web-app-id> \
     -t asia-south1-docker.pkg.dev/<project-id>/moneyverse/moneyverse:latest .

   docker push asia-south1-docker.pkg.dev/<project-id>/moneyverse/moneyverse:latest
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy moneyverse \
     --image asia-south1-docker.pkg.dev/<project-id>/moneyverse/moneyverse:latest \
     --region asia-south1 \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=<project-id>,GCS_BUCKET_NAME=<your-gcs-lessons-bucket>"
   ```

4. **Post-Deploy Verification:**
   - Add your Cloud Run domain (`https://<service-url>`) to **Firebase Console → Authentication → Settings → Authorized domains**.
   - Verify health check: `curl https://<service-url>/api/health` → `{"status":"ok"}`.
   - Open `https://<service-url>/` in a browser and confirm SPA navigation, login/signup, simulations, Learning Hub, and Leaderboard work end to end.
