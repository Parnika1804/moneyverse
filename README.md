# MoneyVerse

**Learn Money by Managing Life & Business.**

MoneyVerse is a gamified financial literacy platform featuring a 12-month Personal Finance Simulation, a 12-week Business Simulation (Café, Bakery, Clothing Store), an interactive Learning Hub with 6 INR-based lessons & quizzes, an XP & Level system, a Top-10 Leaderboard, and a provider-independent AI Mentor foundation (ready for Phase 10 Gemini Enterprise integration).

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Lucide React, Recharts, Firebase Auth SDK
- **Backend:** Node.js 22, Express, Firebase Admin SDK, Cloud Firestore (`moneyverse-19666`)
- **Free-Tier Deployment:** **Vercel** (Frontend SPA) + **Render** (Express Backend API) + **Firebase Spark Plan** (Auth + Firestore)
- **Content Storage:** Local `server/content/lessons.json` fallback (zero billing required; optional Google Cloud Storage via `GCS_BUCKET_NAME`)
- **AI Mentor:** Provider-independent read-only foundation (Gemini Enterprise planned for Phase 10)

---

## Project Structure

```text
moneyverse/
├── client/                  # React + Vite + Tailwind CSS SPA (deployed to Vercel)
│   ├── src/
│   │   ├── components/      # Dashboard layout, Personal, Business, Leaderboard UI
│   │   ├── context/         # Firebase Authentication context
│   │   ├── lib/             # Firebase client & authenticated Axios helpers
│   │   └── pages/           # Landing, Auth, Dashboard, Simulations, Learning Hub, AI Mentor
│   ├── vercel.json          # SPA client-side routing rewrites
│   ├── .env.example
│   └── package.json
├── server/                  # Node.js + Express API (deployed to Render)
│   ├── content/             # Local lessons.json (6 INR financial literacy lessons, no GCS billing needed)
│   ├── src/
│   │   ├── config/          # Firebase Admin (Render env JSON OR Application Default Credentials)
│   │   ├── controllers/     # Express request handlers
│   │   ├── middleware/      # Firebase ID token verification
│   │   ├── routes/          # /health, /profile, /personal, /business, /mentor, /content, /leaderboard
│   │   ├── services/        # Simulation engines, quiz/XP, leaderboard, storage fallback, AI adapter interface
│   │   ├── app.js           # Express app, CORS, Helmet, production static fallback
│   │   └── index.js         # PORT / 0.0.0.0 listener & graceful shutdown
│   ├── tests/               # Backend unit & Firestore integration tests
│   ├── .env.example
│   └── package.json
├── render.yaml              # Render free-tier backend Blueprint
├── vercel.json              # Root Vercel SPA build & rewrite config
├── Dockerfile               # Optional multi-stage container (Cloud Run / self-hosting)
├── .dockerignore
├── .gcloudignore
├── .gitignore
├── package.json
└── README.md
```

---

## Local Development

### 1. Environment Variables

Copy the templates and fill in your local values (never commit `.env` files or service account keys):

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### 2. Install & Run

```bash
npm run install:all

# Start both servers together
npm run dev

# Or in separate terminal tabs
npm run dev:server   # http://127.0.0.1:5000
npm run dev:client   # http://localhost:5173 (proxies /api -> http://127.0.0.1:5000)
```

### 3. Build & Test

```bash
# Production frontend build
npm run build

# Backend unit tests
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

## Free-Tier Deployment Guide (Render + Vercel — No Credit Card / No Billing)

This deployment architecture uses **Render Free Tier** for the Express API, **Vercel Hobby (Free) Tier** for the React/Vite SPA, and your existing **Firebase (`moneyverse-19666`) Spark Plan** for Authentication and Cloud Firestore. Lessons are served from the bundled `server/content/lessons.json` fallback so **Google Cloud Storage billing is not required**.

### 1. GitHub → Render Backend Deployment

1. Push your repository to GitHub (verify `.env` and `serviceAccountKey.json` are NOT committed).
2. Sign in to [Render](https://dashboard.render.com/) with GitHub.
3. Click **New + → Blueprint** (uses `render.yaml` automatically) **or** click **New + → Web Service** and connect your GitHub repository with:
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install --omit=dev`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
   - **Health Check Path:** `/api/health`

### 2. Render Environment Variables

In your Render Web Service → **Environment**, add the following variables (do **not** commit credentials to Git):

| Key | Value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables production logging and strict CORS |
| `GCP_PROJECT_ID` | `moneyverse-19666` | Your existing Firebase / Firestore project ID |
| `CLIENT_URL` | `https://<your-app>.vercel.app` | Set this after Step 3 (comma-separate multiple URLs if needed; no trailing slash required) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | *(paste full contents of your service account JSON, or its Base64 string)* | Marked secret in Render; read cleanly by `server/src/config/firebase.js` |
| `GCS_BUCKET_NAME` | *(leave blank)* | Keeps local `server/content/lessons.json` fallback with zero billing |

> **Tip for `FIREBASE_SERVICE_ACCOUNT_JSON`:** You can minify your local `server/serviceAccountKey.json` to a single line (or Base64-encode it via `[Convert]::ToBase64String([IO.File]::ReadAllBytes("server/serviceAccountKey.json"))` in PowerShell) and paste it directly into Render's `FIREBASE_SERVICE_ACCOUNT_JSON` secret variable. Never commit the file itself.

Click **Deploy Web Service** and note your Render backend URL, e.g.:
`https://moneyverse-api.onrender.com`

### 3. GitHub → Vercel Frontend Deployment

1. Sign in to [Vercel](https://vercel.com/) with GitHub.
2. Click **Add New → Project** and import your MoneyVerse GitHub repository.
3. Configure project settings:
   - **Root Directory:** `client` *(recommended; `client/vercel.json` handles SPA rewrites, and root `vercel.json` also works if left at repo root)*
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 4. Vercel Environment Variables

In Vercel → **Project Settings → Environment Variables**, add these public variables for **Production** (and Preview if desired):

| Key | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com/api` |
| `VITE_FIREBASE_API_KEY` | Your Firebase Web App API Key (`moneyverse-19666`) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `moneyverse-19666.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `moneyverse-19666` |
| `VITE_FIREBASE_APP_ID` | Your Firebase Web App ID |

> Never put `FIREBASE_SERVICE_ACCOUNT_JSON`, private keys, or backend secrets in Vercel environment variables.

Deploy the project and note your Vercel URL, e.g. `https://moneyverse.vercel.app`.
Then go back to **Render → Environment** and set `CLIENT_URL=https://moneyverse.vercel.app` (Render will automatically redeploy with the updated CORS origin).

### 5. Firebase Authentication Authorized Domains

1. Open [Firebase Console](https://console.firebase.google.com/) → project **`moneyverse-19666`**.
2. Go to **Build → Authentication → Settings → Authorized domains**.
3. Click **Add domain** and add your deployed Vercel domain (e.g., `moneyverse.vercel.app`, without `https://`).
4. Keep `localhost` authorized so local development continues working.

### 6. Testing the Deployed Application

1. **Backend Health Check:**
   Open `https://<your-render-service>.onrender.com/api/health` in a browser (or `curl`) — expect `{"status":"ok"}`. *(First request after 15 minutes of inactivity may take ~30–50 seconds while Render's free instance wakes up.)*
2. **Landing Page & API Status:**
   Open `https://<your-app>.vercel.app/` — verify the landing page loads and the header badge shows **API Online**.
3. **Authentication & Dashboard:**
   Sign up or log in at `/signup` or `/login`, confirm `/dashboard` loads your Firestore profile (`wallet`, `xp`, `level`, `badges`, `recentActivities`, and Top-10 Leaderboard).
4. **SPA Deep-Link Refresh:**
   Refresh the browser on `/dashboard/personal-finance`, `/dashboard/business-simulation`, `/dashboard/learning-hub`, and `/dashboard/ai-mentor` — verify Vercel serves the SPA without `404`.
5. **Protected APIs & End-to-End Flows:**
   - Start and step a Personal Finance month (`POST /api/personal/start`, `POST /api/personal/step`).
   - Start and step a Business Simulation week (`POST /api/business/start`, `POST /api/business/step`).
   - Load the 6 lessons (`GET /api/content/lessons`), submit a quiz (`POST /api/content/quiz`), confirm XP increases and duplicate attempts award `+0 XP`, and check `GET /api/leaderboard`.
   - Open `/dashboard/ai-mentor` and confirm read-only Firestore run retrieval works cleanly.
