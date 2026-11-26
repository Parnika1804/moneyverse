<div align="center">

# MoneyVerse

### **Learn Money by Managing Life & Business.**

A gamified financial literacy platform where learners practice personal finance, run virtual small businesses, complete Indian Rupee (`₹`) lessons and quizzes, earn XP and badges, and compete on a privacy-safe leaderboard.

[![Live Frontend](https://img.shields.io/badge/Live_App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://moneyverse-kappa.vercel.app)
[![Live API](https://img.shields.io/badge/Live_API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=000000)](https://moneyverse-api.onrender.com/api/health)
[![React](https://img.shields.io/badge/React_18-Vite_6-61DAFB?style=for-the-badge&logo=react&logoColor=000000)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js_22-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=000000)](https://firebase.google.com/)

[Live Application](https://moneyverse-kappa.vercel.app) · [API Health Check](https://moneyverse-api.onrender.com/api/health) · [Repository](https://github.com/Parnika1804/moneyverse)

</div>

---

## Live Deployment

| Service | Platform | URL |
| --- | --- | --- |
| **Frontend (React SPA)** | Vercel | https://moneyverse-kappa.vercel.app |
| **Backend (Express API)** | Render | https://moneyverse-api.onrender.com |
| **API Health Check** | Render | https://moneyverse-api.onrender.com/api/health |
| **Source Code** | GitHub | https://github.com/Parnika1804/moneyverse |

> **Note:** The backend runs on Render's free tier, so the first request after ~15 minutes of inactivity may take 30–50 seconds while the container wakes up.

---

## Problem Statement & Solution

### The Problem
Most students and young adults enter financial independence without practical experience managing cash flow, compounding loan interest, inflation, taxes, or small-business unit economics. Traditional financial literacy content is passive—reading static articles rarely builds lasting decision-making habits—while learning through trial and error with real money is costly.

### The MoneyVerse Solution
MoneyVerse turns financial education into a **risk-free, server-verified simulation platform** grounded in realistic Indian Rupee (`₹`) scenarios:
- **Learn by doing:** Manage 12 months of personal household finances and 12 weeks of small-business operations with real-world shocks (medical bills, rent hikes, inflation spikes, festival demand surges, and equipment breakdowns).
- **Reinforce with structured micro-learning:** Study six core financial literacy topics and test understanding through backend-graded quizzes.
- **Stay motivated with progression:** Earn server-verified XP, levels, and badges, and track your rank on a Top-10 leaderboard without exposing private user data.
- **Server-authoritative integrity:** Every balance, interest charge, P&L statement, quiz score, and XP reward is calculated strictly on the backend and persisted in Cloud Firestore.

---

## Features

### Currently Implemented
- **Firebase Authentication & Protected Workspace**
  - Email/Password signup, login, and dedicated logout flows using the official `firebase` npm SDK.
  - Protected frontend routes and Express middleware (`verifyFirebaseToken`) verifying Firebase ID tokens on all student APIs.
  - Automatic Firestore profile initialization (`users/{uid}`) with `₹30,000` virtual wallet, `0 XP`, `Level 1`, `badges: []`, and `recentActivities: []`. No passwords are ever stored in Firestore.
- **Personal Finance Simulation (12 Months)**
  - Start with `₹30,000` wallet and `₹30,000` monthly income; allocate savings percentage (`0–100%`), spending budget, loans (`2%` monthly interest), and loan repayments each month.
  - Simulates five unexpected life events: medical emergencies, inflation spikes, rent increases, work bonuses, and side-income opportunities.
  - Prevents negative or impossible balances, saves every monthly step under `users/{uid}/runs/{runId}`, supports resuming active runs, and displays Recharts balance/expense graphs, a 12-month timeline, and a final financial health score (`0–100`) and grade (`A+`–`D`).
- **Business Simulation (12 Weeks)**
  - Choose between three business models—**Café**, **Bakery**, or **Clothing Store**—each starting with `₹50,000` capital.
  - Make weekly decisions on **restock units**, **selling price**, and **marketing spend**.
  - Deterministic seeded engine calculates demand, inventory, units sold, revenue, expenses, marketing cost, profit/loss, non-negative remaining cash, business score, and grade while simulating supplier price increases, festival demand surges, equipment breakdowns, unexpected supplier discounts, and reduced customer demand.
  - Persists runs under `users/{uid}/businessRuns/{runId}` with run-ownership checks, resume support, Recharts P&L visualizations, a 12-week timeline, and a final business report.
- **Learning Hub & Quiz Engine**
  - Six beginner-friendly Indian Rupee (`₹`) financial literacy lessons: **Banking**, **Budgeting**, **Loans and Interest**, **Taxation**, **Entrepreneurship**, and **Inflation**.
  - Each lesson includes an explanation, a practical `₹` example, and three 4-option MCQs.
  - Answer keys are stripped before lessons are served; submissions are graded on the backend with per-question explanations.
  - Supports reading `lessons/lessons.json` from Google Cloud Storage (`GCS_BUCKET_NAME`) with automatic fallback to bundled `server/content/lessons.json`.
- **XP, Levels, Badges & Leaderboard**
  - Awards `25 XP` per newly mastered quiz question (transactional Firestore updates prevent duplicate XP farming while preserving existing profile data).
  - Automatic level progression (`500 XP` per level) and milestone badges (`First Quiz Mastered`, `Financial Literacy Scholar`).
  - Top-10 Leaderboard (`GET /api/leaderboard`) sorted by XP descending, strictly whitelisting public fields (`rank`, `displayName`, `xp`, `level`, `badgesCount`, `isCurrentUser`) and never exposing emails, UIDs, wallets, or private fields.
- **AI Mentor Foundation (Read-Only Scaffold — Phase 10 Pending)**
  - Protected `/api/mentor/*` endpoints and `/dashboard/ai-mentor` dashboard retrieve the authenticated student's real Firestore simulation runs in read-only mode with run-ownership verification.
  - Presents all five planned sections (**Financial Performance Analysis**, **Financial Mistake Detection**, **Personalised Financial Advice**, **Explain My Decisions**, **Financial Challenges**) via a provider-independent adapter interface (`aiProvider.interface.js`).
  - **Status:** Live **Gemini Enterprise AI analysis is NOT yet active** and is planned for **Phase 10**. No fake AI responses are generated, and the mentor layer cannot modify financial balances or simulation calculations.

---

## Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 4, React Router 7, Axios, Lucide React, Recharts, Firebase Web SDK |
| **Backend** | Node.js 22 (ESM), Express 4, Helmet, CORS, Morgan, Firebase Admin SDK |
| **Auth & Database** | Firebase Authentication (Email/Password), Cloud Firestore |
| **Content Storage** | `@google-cloud/storage` with automatic local `server/content/lessons.json` fallback |
| **Hosting (Free Tier)** | **Vercel** (Frontend SPA) + **Render** (Express API) + **Firebase Spark Plan** (Auth & Firestore) |
| **Containerization** | Multi-stage root `Dockerfile` (optional self-hosting / Cloud Run readiness) |

---

## System Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                   React + Vite SPA (Vercel)                          │
│  Landing │ Auth │ Dashboard │ Personal Sim │ Business Sim │ Learning │
│  AI Mentor UI                                                        │
│     • Firebase Web SDK handles Email/Password Auth & ID tokens       │
│     • Axios interceptor attaches `Authorization: Bearer <idToken>`   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTPS (CORS + Bearer ID Token)
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 Node.js + Express API (Render)                       │
│  /api/health      (public)                                           │
│  /api/profile     (Firebase ID token verified via auth.middleware)   │
│  /api/personal    (deterministic 12-month financial engine)          │
│  /api/business    (deterministic 12-week business engine)            │
│  /api/content     (lessons loader + backend quiz grader & XP)        │
│  /api/leaderboard (privacy-sanitized Top-10 XP query)                │
│  /api/mentor      (read-only Firestore context; Phase 10 AI adapter) │
└────────────────┬───────────────────────────────────┬─────────────────┘
                 │ Firebase Admin SDK                │ Optional GCS / Local Fallback
                 ▼                                   ▼
┌────────────────────────────────────┐   ┌─────────────────────────────┐
│        Firebase / Firestore        │   │  Google Cloud Storage or    │
│  • Firebase Auth (ID token verify) │   │  server/content/lessons.json│
│  • users/{uid}                     │   └─────────────────────────────┘
│  • users/{uid}/runs/{runId}        │
│  • users/{uid}/businessRuns/{runId}│
└────────────────────────────────────┘
```

1. **Client → Backend:** The React app authenticates users via Firebase Authentication, retrieves a short-lived Firebase ID token, and sends it on every protected Axios request to `VITE_API_BASE_URL`.
2. **Backend Validation & Engines:** Express verifies every token via `firebase-admin`, validates all inputs, rejects client-side balance/XP tampering, and computes all financial outcomes deterministically in JavaScript.
3. **Persistence:** Validated state changes are committed atomically using Firestore transactions under the authenticated user's UID.

---

## Project Folder Structure

```text
moneyverse/
├── client/                              # React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── business/                # Business charts, event modal, timeline, results
│   │   │   ├── learning/                # Top-10 LeaderboardCard
│   │   │   ├── personal/                # Personal finance charts, event modal, timeline, results
│   │   │   ├── DashboardLayout.jsx      # Responsive sidebar & header shell
│   │   │   └── ProtectedRoute.jsx       # Firebase session route guard
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # Firebase Auth state, signup (+ profile init), login, logout
│   │   ├── lib/
│   │   │   ├── api.js                   # Axios client with Bearer ID token interceptor
│   │   │   └── firebase.js              # Modular Firebase Web SDK setup
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── LogoutPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── PersonalFinancePage.jsx
│   │   │   ├── BusinessSimulationPage.jsx
│   │   │   ├── LearningHubPage.jsx
│   │   │   └── AiMentorPage.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vercel.json                      # Vercel SPA rewrites (Root Directory = client)
│   └── vite.config.js
├── server/                              # Node.js + Express backend
│   ├── content/
│   │   └── lessons.json                 # 6 INR lessons + 18 MCQs (local fallback)
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.js              # Firebase Admin (env JSON or Google ADC)
│   │   ├── controllers/                 # health, profile, personal, business, mentor, content, leaderboard
│   │   ├── middleware/
│   │   │   └── auth.middleware.js       # Firebase ID token verification
│   │   ├── routes/                      # Express routers mounted under /api
│   │   ├── services/                    # simulation, businessSimulation, quiz, leaderboard, storage, mentor, aiProvider.interface
│   │   ├── app.js                       # Express app, Helmet, CORS, routes, static fallback
│   │   └── index.js                     # Server listener (0.0.0.0:$PORT) & graceful shutdown
│   ├── tests/                           # node:test unit suites & Firestore integration scripts
│   ├── .env.example
│   └── package.json
├── Dockerfile                           # Optional multi-stage production container
├── .dockerignore
├── .gcloudignore
├── .gitignore
├── package.json                         # Root dev/build/start convenience scripts
├── render.yaml                          # Render free-tier Web Service Blueprint
├── vercel.json                          # Root Vercel SPA build & rewrite configuration
└── README.md
```

---

## Local Setup Instructions

### Prerequisites
- **Node.js 20+** (recommended: Node.js 22 LTS) and **npm**
- A Firebase project with **Email/Password Authentication** and **Cloud Firestore** enabled

### 1. Clone the Repository

```bash
git clone https://github.com/Parnika1804/moneyverse.git
cd moneyverse
```

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Configure Environment Variables

Copy the `.env.example` templates and populate them with your own local values (**never commit `.env` files or service-account keys**):

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### 4. Run Frontend & Backend Locally

```bash
# Run Express backend + Vite frontend together
npm run dev
```

Or run them in two separate terminal tabs:

```bash
# Terminal 1 — Backend API (http://127.0.0.1:5000)
npm run dev:server

# Terminal 2 — Frontend SPA (http://localhost:5173)
npm run dev:client
```

Verify locally:
- Health endpoint: `http://127.0.0.1:5000/api/health` → `{"status":"ok"}`
- Frontend app: `http://localhost:5173`

---

## Environment Variables

Refer to [`client/.env.example`](client/.env.example) and [`server/.env.example`](server/.env.example). Never commit actual secrets, private keys, or service-account JSON files.

### Frontend (`client/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Optional (local) / **Yes (Vercel)** | Backend API base URL (e.g., `https://moneyverse-api.onrender.com/api`). Defaults to `/api` locally via Vite's dev proxy. |
| `VITE_FIREBASE_API_KEY` | Yes | Public Firebase Web App API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain (`<project-id>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Yes | Public Firebase Web App ID |

### Backend (`server/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | Optional | Server listening port (`5000` locally; injected automatically by Render) |
| `NODE_ENV` | Optional | `development` locally, `production` in deployment |
| `GCP_PROJECT_ID` | Yes | Firebase / GCP project ID |
| `CLIENT_URL` | Yes (prod) | Comma-separated allowed frontend origins for CORS (e.g., `https://moneyverse-kappa.vercel.app`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local dev option | Path to local gitignored service-account JSON (e.g., `./serviceAccountKey.json`), or leave unset to use `gcloud` ADC |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Render option | Minified JSON or Base64-encoded service-account JSON stored securely as a Render secret env var |
| `GCS_BUCKET_NAME` | Optional | Google Cloud Storage bucket containing `lessons/lessons.json`. Leave empty to use the local `server/content/lessons.json` fallback with zero billing |

---

## Deployment Instructions (Vercel + Render Free Tier)

### 1. Deploy Backend on Render
1. Sign in to [Render](https://dashboard.render.com/) with GitHub.
2. Create a service via **New + → Blueprint** (reads [`render.yaml`](render.yaml)) or **New + → Web Service**:
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install --omit=dev`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
   - **Health Check Path:** `/api/health`
3. Add environment variables in Render:
   - `NODE_ENV=production`
   - `GCP_PROJECT_ID=<your-firebase-project-id>`
   - `CLIENT_URL=https://moneyverse-kappa.vercel.app`
   - `FIREBASE_SERVICE_ACCOUNT_JSON=<raw-or-base64-service-account-json>`
   - `GCS_BUCKET_NAME=` *(leave blank for local JSON fallback)*
4. Verify deployment at `https://moneyverse-api.onrender.com/api/health`.

### 2. Deploy Frontend on Vercel
1. Sign in to [Vercel](https://vercel.com/) with GitHub and import the repository.
2. Configure:
   - **Root Directory:** `client` (`client/vercel.json` handles SPA rewrites; root `vercel.json` also supports root deployment)
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Set Vercel environment variables:
   - `VITE_API_BASE_URL=https://moneyverse-api.onrender.com/api`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
4. Deploy and confirm your frontend domain matches Render's `CLIENT_URL`.

### 3. Configure Firebase Authorized Domains
1. Open **Firebase Console → Build → Authentication → Settings → Authorized domains**.
2. Add your deployed Vercel domain (`moneyverse-kappa.vercel.app`) alongside `localhost`.

---

## API Documentation

All protected endpoints require a valid Firebase ID token header:

```http
Authorization: Bearer <firebase-id-token>
```

### Health Check
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Returns `200 {"status":"ok"}` for Render health checks and frontend status |

### Authentication & Student Profile
| Method | Endpoint | Auth | Request / Response Summary |
| --- | --- | --- | --- |
| `POST` | `/api/profile/init` | Required | Body: `{ displayName? }`. Idempotently creates `users/{uid}` with `₹30,000` wallet, `0 XP`, `Level 1`, `badges: []`, `recentActivities: []`. |
| `GET` | `/api/profile` | Required | Returns the authenticated student's Firestore profile (`wallet`, `xp`, `level`, `badges`, `recentActivities`). |

### Personal Finance Simulation
| Method | Endpoint | Auth | Request / Response Summary |
| --- | --- | --- | --- |
| `POST` | `/api/personal/start` | Required | Starts a 12-month run (`₹30,000` wallet & income) under `users/{uid}/runs/{runId}`. |
| `POST` | `/api/personal/step` | Required | Body: `{ runId, savingsPercentage, spendingBudget, loanAmount, repayAmount }`. Returns updated `state`, `event`, `breakdown`, `score`, `grade`, `monthsCompleted`, `completed`. |
| `GET` | `/api/personal/history` | Required | Lists the user's runs, or returns a single run with `?runId=<runId>`. |

### Business Simulation
| Method | Endpoint | Auth | Request / Response Summary |
| --- | --- | --- | --- |
| `POST` | `/api/business/start` | Required | Body: `{ businessType }` (`"cafe"`, `"bakery"`, or `"clothing_store"`). Starts a 12-week run with `₹50,000` capital under `users/{uid}/businessRuns/{runId}`. |
| `POST` | `/api/business/step` | Required | Body: `{ runId, restockUnits, sellingPrice, marketingSpend }`. Returns updated `state`, `event`, `breakdown`, `score`, `grade`, `weeksCompleted`, `completed`. |
| `GET` | `/api/business/history` | Required | Lists the user's business runs, or returns a single run with `?runId=<runId>`. |

### AI Mentor Foundation (Read-Only · Phase 10 AI Pending)
| Method | Endpoint | Auth | Request / Response Summary |
| --- | --- | --- | --- |
| `GET` | `/api/mentor/status` | Required | Returns `readOnly: true`, `aiStatus` (`configured: false`, `availableAfterPhase: 10`), and supported sections. |
| `GET` | `/api/mentor/runs` | Required | Read-only list of the authenticated student's personal finance simulation runs. |
| `GET` | `/api/mentor/runs/:runId` | Required | Verifies run ownership and returns read-only run data + section metadata for all 5 mentor sections. |
| `POST` | `/api/mentor/request` | Required | Body: `{ section, runId?, month? }`. Verifies ownership and returns Phase 10 readiness status (`advisory: null`, no fake AI output). |

### Learning Hub & Quizzes
| Method | Endpoint | Auth | Request / Response Summary |
| --- | --- | --- | --- |
| `GET` | `/api/content/lessons` | Required | Returns all 6 lessons (answer keys stripped) with the student's per-lesson completion & XP progress. |
| `POST` | `/api/content/quiz` | Required | Body: `{ lessonId, answers: [0..3, 0..3, 0..3] }`. Grades on backend, awards XP only for newly mastered questions, prevents duplicate XP farming, and returns per-question explanations. |

### Leaderboard
| Method | Endpoint | Auth | Request / Response Summary |
| --- | --- | --- | --- |
| `GET` | `/api/leaderboard` | Required | Returns Top 10 users sorted by `xp` descending with safe public fields only (`rank`, `displayName`, `xp`, `level`, `badgesCount`, `isCurrentUser`). |

---

## Testing

### Automated Backend Unit Tests (19 Tests)
Runs offline using Node's built-in `node:test` runner (Business Simulation, Learning Hub, Quiz/XP, Leaderboard privacy, GCS fallback, Production routes/static serving, CORS, and Firebase Admin env parsing):

```bash
npm --prefix server test
```

### Frontend Production Build

```bash
npm run build
```

### Optional Live Firestore Integration Scripts
Requires valid local `client/.env` and `server/.env` credentials:

```bash
node server/tests/businessSimulation.integration.mjs
node server/tests/learningHub.integration.mjs
```

---

## Screenshots

> Screenshots have not been added to the repository yet. Replace the placeholders below once UI captures are added under `docs/screenshots/`.

| View | Preview |
| --- | --- |
| **Landing Page** | `![MoneyVerse Landing Page](docs/screenshots/landing.png)` *(coming soon)* |
| **Student Dashboard & Leaderboard** | `![MoneyVerse Dashboard](docs/screenshots/dashboard.png)` *(coming soon)* |
| **Personal Finance Simulation** | `![Personal Finance Simulation](docs/screenshots/personal-finance.png)` *(coming soon)* |
| **Business Simulation** | `![Business Simulation](docs/screenshots/business-simulation.png)` *(coming soon)* |
| **Learning Hub & Quizzes** | `![Learning Hub](docs/screenshots/learning-hub.png)` *(coming soon)* |

---

## Current Project Limitations

- **Render Free-Tier Cold Starts:** Render spins down free web services after 15 minutes of inactivity. The first request after sleep may take ~30–50 seconds to wake up (the Axios client uses a 30-second timeout; retrying once after wake-up resolves immediately).
- **Gemini Enterprise Integration Pending (Phase 10):** The AI Mentor backend and UI are built as a read-only, provider-independent foundation. Live AI analysis, mistake commentary, personalised advice, decision explanations, and generated challenges will be enabled once official Gemini Enterprise integration is completed in Phase 10.
- **Google Cloud Storage Fallback:** On zero-billing deployments without `GCS_BUCKET_NAME`, lessons are served reliably from the bundled `server/content/lessons.json` file rather than a paid Cloud Storage bucket.
- **No Real Money / Advisory Disclaimer:** All wallets, loans, profits, and tax examples in MoneyVerse are strictly virtual and for educational purposes only.
