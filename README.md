# FabriSense

FabriSense is an AI-powered textile quality inspection and authentication platform with web and Android support built using React, Vite, Node.js/Express, and Capacitor.

---

## 📁 Project Architecture & Folder Structure

```
fabrisense-1/
├── frontend/             # React + Vite web user interface (single source of truth for UI)
│   ├── src/              # React components, pages, styles, assets, and api service
│   ├── public/           # Static assets, icons, and web manifest
│   ├── index.html        # Single-page application entry point
│   ├── package.json      # Frontend dependencies (React, Vite, Lucide, etc.)
│   ├── vite.config.js    # Vite configuration & dev proxy
│   └── .env.example      # Frontend environment template (VITE_API_BASE_URL)
│
├── backend/              # [ACTIVE BACKEND] Node.js + Express API server
│   ├── config/           # Centralized environment and SMTP config
│   ├── controllers/      # Route request/response controllers
│   ├── routes/           # Express API route declarations
│   ├── services/         # Business logic (OTP generation, hashing, Nodemailer)
│   ├── package.json      # Backend dependencies (Express, CORS, Nodemailer, Dotenv)
│   ├── .env.example      # Backend environment template (PORT, SMTP credentials)
│   └── index.js          # Backend server entry point (PORT 5000)
│
├── android/              # Native Capacitor Android project (gradle, native shell, assets)
├── resources/            # High-resolution app icons and splash resources for Android
├── server/               # [LEGACY / INACTIVE] Original monolithic server (kept for reference)
├── capacitor.config.json # Capacitor configuration pointing to "webDir": "frontend/dist"
├── package.json          # Root orchestrator package.json
└── README.md             # Project documentation
```

### Folder Roles & Status

- **`frontend/`** — **Active Frontend**: Contains all user interfaces, login/registration flows, OTP verification modals, inspection dashboards, and the frontend API service client.
- **`backend/`** — **Active Backend**: The primary, active backend API powering email OTP verification, password resets, rate-limiting, and security hashing.
- **`server/`** — **Legacy / Inactive Server**: The original monolithic prototype server. It is inactive in the normal workflow and retained solely for historical reference and legacy test comparison. All active development must use `backend/`.
- **`android/`** — **Native Android Project**: Capacitor native container that embeds the production web build (`frontend/dist`) into an Android APK/bundle.
- **`resources/`** — **Asset Resources**: Source icons and splash graphics used by Capacitor tooling.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies

From the project root (`fabrisense-1/`):
```bash
npm run install:all
```
*(Or run `npm install` inside `frontend/` and `backend/`)*

---

### 2. Configure Environment Variables

1. **Backend Environment** (create `backend/.env` or root `.env` from `backend/.env.example`):
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_ORIGIN=http://localhost:5173

   # Optional: Configure SMTP for live email delivery (logs to console in dev mode if omitted)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_16_char_app_password
   SMTP_FROM="FabriSense Security" <your_email@gmail.com>
   ```

2. **Frontend Environment** (create `frontend/.env` from `frontend/.env.example`):
   ```env
   # Leave empty for browser development (Vite proxy forwards /api to localhost:5000)
   # For Android emulator: http://10.0.2.2:5000
   # For Android device (LAN): http://192.168.x.x:5000
   VITE_API_BASE_URL=
   ```

---

### 3. Run Frontend & Backend

- **Start Frontend (Vite dev server at http://localhost:5173)**:
  ```bash
  # From project root:
  npm run dev

  # Or directly from frontend/:
  cd frontend
  npm run dev
  ```

- **Start Active Backend (Express API at http://localhost:5000)**:
  ```bash
  # From project root:
  npm run backend

  # Or directly from backend/:
  cd backend
  npm run dev    # or: npm start
  ```

---

### 4. Build & Sync for Android

To compile the React frontend and sync it directly into the native Android application:

```bash
# 1. Build the frontend into frontend/dist
npm run build

# 2. Synchronize web assets into Android project
npx cap sync android

# 3. Open Android Studio
npx cap open android
```
*(Or run directly on a connected device/emulator via `npx cap run android`)*
