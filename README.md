# MoneyVerse

**Learn Money by Managing Life & Business.**

MoneyVerse is a gamified financial literacy platform where learners build real-world personal finance habits and business acumen through interactive life and entrepreneurship simulations.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Lucide React, Recharts
- **Backend:** Node.js, Express
- **Auth & Database:** Firebase Authentication, Cloud Firestore
- **Storage:** Google Cloud Storage
- **AI:** Gemini AI integration (planned)

## Project Structure

```text
moneyverse/
├── client/                  # React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── lib/             # Axios API client
│   │   └── pages/           # Landing page
│   ├── .env.example
│   └── package.json
├── server/                  # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic & external integrations
│   │   ├── app.js           # Express app configuration
│   │   └── index.js         # Server entrypoint
│   ├── .env.example
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### 1. Environment Variables

Copy the example environment files and populate your local values (never commit `.env` files or service account keys):

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Run in Development

Starts both the Express backend (`http://localhost:5000`) and Vite frontend (`http://localhost:5173`) concurrently:

```bash
npm run dev
```

### 4. Build & Start

```bash
# Build frontend for production
npm run build

# Start backend server
npm start
```

## API Endpoints

| Method | Endpoint      | Response          | Description          |
| ------ | ------------- | ----------------- | -------------------- |
| `GET`  | `/api/health` | `{"status":"ok"}` | Service health check |
