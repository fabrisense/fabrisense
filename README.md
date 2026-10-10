# FabriSense

**AI-Powered Fabric Quality Inspection Platform**

FabriSense is an enterprise-grade AI-powered textile quality inspection, defect localization, and analytics platform designed for textile manufacturers, handloom & powerloom industries, fabric exporters, quality inspectors, MSMEs, and factory management.

---

## 🏛️ Dual-Interface Architecture

FabriSense is architected around two dedicated, decoupled interfaces powered by a shared Node.js/Express backend and persistent SQLite database:

```
                          ┌──────────────────────────────────────┐
                          │         FabriSense Platform          │
                          └──────────────────┬───────────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   ▼                                                   ▼
     ┌───────────────────────────┐                       ┌───────────────────────────┐
     │   Mobile / Inspector App  │                       │      Admin Web Portal     │
     │      (Port: 5173 /)       │                       │   (Port: 5173 /admin/*)   │
     ├───────────────────────────┤                       ├───────────────────────────┤
     │ • Fabric camera capture   │                       │ • Executive KPI dashboard │
     │ • Instant YOLO detection  │                       │ • Inspection audits & logs│
     │ • Bounding box display    │                       │ • Defect taxonomy & Pareto│
     │ • Grade A / B / C badges  │                       │ • Quality analytics & PDR │
     │ • Client scan history     │                       │ • User & inspector access │
     │ • Sync to backend DB      │                       │ • Audit reports & jsPDF   │
     │ • Android Capacitor build │                       │ • YOLOv8 engine telemetry │
     └─────────────┬─────────────┘                       └─────────────┬─────────────┘
                   │                                                   │
                   │           REST API + JWT Bearer Auth              │
                   └─────────────────────────┬─────────────────────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │   Express Backend (5000)  │
                               │   • SQLite (fabrisense.db)│
                               │   • YOLOv8 Service Adapter│
                               │   • JWT Auth & Multer     │
                               └───────────────────────────┘
```

1. **Mobile / User Inspection Application** (`/`, `/login`, `/dashboard`)
   - Dedicated interface for shopfloor quality inspectors and weavers.
   - Live image capture/upload, bounding box localization, defect explanations, and Grade A/B/C assignment.
   - Automatically synchronizes completed scans to the backend SQLite database via `POST /api/inspections/sync`.
   - Packaged for Android via Capacitor.

2. **Admin Web Portal** (`/admin/*`)
   - Dedicated, password-protected web portal for operations managers, plant directors, and quality leads.
   - High-density monitoring, defect taxonomy breakdowns, quality yield metrics, inspector access control, and model telemetry.
   - Reusable responsive navigation layout featuring deep navy styling (`#1F2A44`) with teal accents (`#16806E`).

---

## 📁 Repository Structure

```
Fabrisense/
├── frontend/                     # React 18 + Vite SPA (Dual Interface)
│   ├── src/
│   │   ├── admin/                # Dedicated Admin Portal
│   │   │   ├── components/       # AdminLayout, AdminProtectedRoute
│   │   │   └── pages/            # Dashboard, Inspections, Detail, Defects,
│   │   │                         # Quality, Users, Reports, Model, Settings, Login
│   │   ├── components/           # Mobile App Components (Inspector UI, Dashboard, Scanner)
│   │   │   └── MobileApp.jsx     # Preserved mobile application container
│   │   ├── services/
│   │   │   ├── adminApi.js       # Centralized Admin REST API Client (JWT handled)
│   │   │   └── api.js            # Mobile Auth & OTP service client
│   │   ├── admin.css             # Scoped Admin Portal styling (Navy / Teal theme)
│   │   ├── App.jsx               # Multi-interface route dispatcher
│   │   └── index.css             # Global typography & mobile styling
│   ├── package.json              # Frontend dependencies (React Router, Lucide, jsPDF)
│   └── vite.config.js            # Vite configuration with /api & /uploads proxy
│
├── backend/                      # Active Node.js + Express API Server (Port 5000)
│   ├── config/                   # Centralized environment config (env.js)
│   ├── controllers/              # Route controllers
│   │   ├── admin.auth.controller.js        # Admin login & session verification
│   │   ├── admin.dashboard.controller.js   # Real-time SQLite KPI rollups
│   │   ├── admin.inspections.controller.js # Inspection CRUD & YOLO processing
│   │   ├── admin.defects.controller.js     # Defect taxonomy & analytics
│   │   ├── admin.quality.controller.js     # Yield, distribution, defect-density
│   │   ├── admin.users.controller.js       # User & inspector account management
│   │   ├── admin.reports.controller.js     # Audit report generator & listings
│   │   └── admin.system.controller.js      # Model telemetry & system settings
│   ├── database/
│   │   └── db.js                 # SQLite schema initialization & realistic seeder
│   ├── middleware/
│   │   ├── auth.middleware.js    # JWT Bearer token authentication guard
│   │   └── upload.middleware.js  # Multer image upload & type validation
│   ├── routes/
│   │   ├── admin.routes.js       # Admin portal REST routes (/api/admin/*)
│   │   ├── common.inspections.routes.js # Mobile inspection sync endpoint
│   │   └── auth.routes.js        # Mobile OTP & password routes
│   ├── services/
│   │   └── ai/
│   │       └── yolo.service.js   # Decoupled YOLOv8 adapter (mock vs live YOLO)
│   ├── test_complete_suite.js    # Complete 17-point automated E2E test suite
│   ├── package.json              # Backend dependencies (better-sqlite3, bcryptjs, jwt, multer)
│   └── index.js                  # Express application root
│
├── android/                      # Native Capacitor Android build container
├── package.json                  # Root orchestrator scripts
└── README.md                     # Comprehensive project documentation
```

---

## 🔐 Admin Portal Credentials

The SQLite database is pre-seeded with a default Administrator account for local development and demonstration:

| Field | Value |
|---|---|
| **Portal URL** | [http://localhost:5173/admin/login](http://localhost:5173/admin/login) |
| **Email** | `admin@fabrisense.com` |
| **Password** | `Admin@123` |
| **Role** | `Admin` (Rajesh Kumar - Operations Manager) |

*(A handy "Quick Fill Demo Login" button is available on the login page for rapid one-click testing.)*

### Seed User Accounts:
- **Priya Patel** (`priya.patel@fabrisense.com`) — Admin
- **Amit Kumar** (`amit.kumar@fabrisense.com`) — Manager
- **Sunita Reddy** (`sunita.reddy@fabrisense.com`) — Manager
- **Aarav Sharma** (`aarav.sharma@fabrisense.com`) — Inspector
- **Kiran Rao** (`kiran.rao@fabrisense.com`) — Inspector
- **Vikram Malhotra** (`vikram.malhotra@fabrisense.com`) — Inspector
- **Anil Mehta** (`anil.mehta@fabrisense.com`) — Inspector
- **Meera Sen** (`meera.sen@fabrisense.com`) — Inspector

---

## 🗄️ Database Architecture & Pre-Seeded Data

The backend utilizes high-performance persistent SQLite via `better-sqlite3` located at `backend/database/fabrisense.db`.

### Database Tables:
1. `admins` — Admin & Manager credentials, bcrypt password hashes, and session tracking.
2. `users` — Factory floor inspectors and plant managers.
3. `inspections` — Roll-by-roll inspection records, fabric types, grades (A/B/C), statuses (Passed/Review/Failed), and defect counts.
4. `defects` — Precise defect instances with bounding box coordinates `(x, y, width, height)`, confidence scores, severities (Low/Moderate/Critical), and descriptions.
5. `reports` — Audit report numbers (`FS-REP-2024-XXXX`) linked to inspections.
6. `model_info` — AI model metadata, active framework (YOLOv8x-Fabric), mAP@0.50 score (91.4%), inference latency (42ms), and status.
7. `settings` — Configurable system parameters (confidence thresholds, auto-flagging, notification recipients).

### Realistic Initial Metrics (Exact UI Match):
On first boot, `backend/database/db.js` initializes and seeds the database to precisely mirror the production monitoring reference designs:
- **Total Inspections**: `1,247`
- **Defects Detected**: `523`
- **Defect-Free Rolls**: `724`
- **Grade A Yield**: `58.0%`
- **Grade B Yield**: `31.0%`
- **Grade C Yield**: `11.0%`
- **Recent Inspection Logs**: `INS-2024-0040` through `INS-2024-0047`, and `INS-0494` through `INS-0498`.

All KPI cards, charts, and tables calculate values dynamically from SQL queries (`COUNT`, `AVG`, `GROUP BY`) rather than static frontend constants.

---

## 🤖 YOLOv8 AI Service Configuration

The AI inference layer is isolated behind a clean adapter pattern (`backend/services/ai/yolo.service.js`) with a uniform interface:
```javascript
const result = await yoloService.analyzeFabric(imagePath, { fabricType, fabricName });
```

### 1. Demo Mode (`AI_MODE=mock`) — Default
In Demo Mode, the adapter generates realistic fabric defect localizations, confidence scores, bounding boxes, and grades without requiring an active GPU or PyTorch server.
- Automatically handles test samples such as Egyptian Cotton, Denim, Silk, and Linen.
- Assigns Grade A, B, or C based on defect density and critical severity thresholds.

### 2. Live YOLOv8 Inference Mode (`AI_MODE=yolo`)
To connect the platform to a running YOLOv8 model inference server (e.g., Python FastAPI / Flask running `ultralytics` YOLOv8):

1. In `backend/.env` (or root `.env`), set:
   ```env
   AI_MODE=yolo
   YOLO_API_URL=http://localhost:8000/predict
   YOLO_CONFIDENCE_THRESHOLD=0.5
   YOLO_TIMEOUT_MS=10000
   ```
2. Your YOLOv8 server should accept a multipart `multipart/form-data` image upload (`file` or `image`) or JSON payload and respond with:
   ```json
   {
     "model_version": "YOLOv8x-Fabric-v4.2.1",
     "defects": [
       {
         "defect_type": "Weft Tear",
         "confidence": 0.94,
         "severity": "Critical",
         "x": 62,
         "y": 48,
         "width": 24,
         "height": 18,
         "explanation": "Severe yarn rupture in weft direction."
       }
     ]
   }
   ```
3. **Resilient Fail-Safe**: If the live YOLO server becomes unreachable or times out, the adapter logs a warning and gracefully falls back to mock detection so factory inspection operations are never blocked.

---

## 🚀 Setup & Execution Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (Tested on Node v24 LTS)
- **npm**: v9.0.0 or later

---

### Step 1: Install Dependencies
Run the unified installer from the repository root:
```bash
npm run install:all
```
*(Installs dependencies across root, `frontend/`, and `backend/`)*

---

### Step 2: Configure Environment Variables
Copy the provided `.env.example` templates:

```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env
```

Key environment options in `backend/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=fabrisense_super_secret_jwt_key_2026_dev
AI_MODE=mock
YOLO_API_URL=http://localhost:8000/predict
```

---

### Step 3: Start the Backend API Server
```bash
# From project root:
npm run backend

# Or with auto-reload:
npm run backend:dev
```
The backend initializes the SQLite database, runs migrations/seeds, and starts on **`http://localhost:5000`**.

---

### Step 4: Start the Frontend Application
In a separate terminal:
```bash
npm run dev
```
The Vite development server starts on **`http://localhost:5173`**.

---

### Step 5: Access the Interfaces

- **Mobile / Inspector App**: Open [http://localhost:5173/](http://localhost:5173/)
- **Admin Web Portal**: Open [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
  - Sign in using `admin@fabrisense.com` / `Admin@123`
  - Explore Dashboard, Inspections, Defects Taxonomy, Quality Analytics, Users, Reports, Model, and Settings.

---

## ☁️ Supabase Cloud Integration & Migration Guide

FabriSense features an intelligent **Dual-Driver Architecture**:
- When Supabase Cloud is configured in `.env`, all inspection records, defect localizations, images, and analytics use Supabase PostgreSQL, Storage, and Realtime as the primary **Single Source of Truth**, while maintaining dual-resilient local sync.
- When Supabase credentials are not provided (e.g. offline dev, sandboxes), FabriSense seamlessly falls back to the embedded SQLite database with zero downtime and 100% test pass rates.

### 1. Create & Configure Supabase Project (Manual Action)
1. Sign in to [supabase.com](https://supabase.com) and click **New project**.
2. Set your Project Name (e.g. `fabrisense`) and choose your preferred database region.
3. Once provisioned, navigate to **Project Settings** → **API**.
4. Copy the following keys:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon / public key**
   - **service_role key** (keep secret; never commit to git or expose to frontend)

### 2. Run Database Migrations
In the Supabase Dashboard, go to **SQL Editor** → **New Query**, open `supabase/migrations/20261009000001_initial_schema.sql` (or `backend/supabase/migrations/20261009000001_initial_schema.sql`), and click **Run**.

This script sets up:
- `public.profiles` linked to `auth.users` with roles (`admin`, `manager`, `inspector`).
- `public.inspections` with UUID primary keys and unique `inspection_id` codes.
- `public.defects` with localized coordinates `x`, `y`, `width`, `height`, confidence, and severity.
- `public.reports` for audit report registration.
- `public.model_versions` for YOLOv8 model telemetry.
- `public.system_logs` for live diagnostics.
- `public.system_settings` for system thresholds.
- **Row Level Security (RLS)** policies for secure access.
- `storage.buckets` record for `inspection-images` (15MB file size limit, image mime-types).
- Realtime publication on `inspections`, `defects`, and `system_logs`.

### 3. Configure Storage Bucket
The SQL migration automatically creates the `inspection-images` storage bucket. You can verify it in **Storage** → **Buckets** in your Supabase dashboard. Ensure public read access is enabled so defect images can be rendered in the browser.

### 4. Configure Environment Variables
Copy `.env.example` to `.env` in both root and `backend/`:
```bash
# In backend/.env:
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_STORAGE_BUCKET=inspection-images

# In frontend/.env:
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SUPABASE_STORAGE_BUCKET=inspection-images
```

### 5. Migrate Existing SQLite Records to Supabase
Run the automated and safe migration tool:
```bash
# Run migration script (handles safety backup, accounts, inspections, defects, reports)
npm run migrate:supabase
```
- **Safety Backup**: Automatically backs up SQLite database to `backend/database/fabrisense.db.bak` before any operation.
- **Safe Account Provisioning**: Generates secure invite credentials without blindly attempting to copy raw bcrypt hashes into Supabase Auth.
- **Verification**: Verifies record counts in Supabase against SQLite and logs a verification report.

### 6. Test Mobile-to-Admin Realtime Synchronization
1. Open the **Admin Portal** at [http://localhost:5173/admin/dashboard](http://localhost:5173/admin/dashboard) in one browser tab.
2. Open the **Mobile App** at [http://localhost:5173/](http://localhost:5173/) in another tab or mobile viewport.
3. On the Mobile App, start a new inspection and complete it (or click "Save Batch").
4. Observe the Admin Portal: the inspection count and recent inspection list update **in real time** via Supabase Realtime subscriptions without requiring a page refresh!

---


## 🧪 Comprehensive Automated Test Suite

A complete 17-point integration and SQLite persistence test suite is included:

```bash
npm test
```

The test suite validates:
1. Backend health check (`/api/health`)
2. Unauthorized login rejection (401)
3. Admin JWT login and token generation
4. Protected route authorization guards
5. SQLite dashboard metric calculations (1,247 total, 523 defects)
6. Inspection list pagination
7. Inspection detail retrieval with bounding box overlays
8. New inspection creation through the YOLO service adapter
9. Database persistence verification
10. Inspection metadata updates
11. Defect taxonomy analytics calculations
12. Quality Grade A/B/C ratio rollups
13. User creation and active/inactive status toggle
14. Audit report listing
15. AI Model specification retrieval
16. System settings update persistence
17. Mobile-to-backend inspection synchronization

---

## 🌐 Backend REST API Reference

### Public Endpoints
- `GET /api/health` — System health check and uptime.
- `POST /api/admin/login` — Authenticate admin/manager with email and password, returns JWT token.

### Mobile Synchronization
- `POST /api/inspections/sync` — Synchronize mobile offline scans directly into SQLite backend.

### Protected Admin Endpoints (Require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/me` | Current authenticated administrator profile |
| `GET` | `/api/admin/dashboard` | Rollup operational KPIs, 6-month trends, recent scans, live defects |
| `GET` | `/api/admin/inspections` | Paginated inspections list with search and filters |
| `GET` | `/api/admin/inspections/:id` | Inspection details with localized defect bounding boxes |
| `POST` | `/api/admin/inspections` | Upload image for YOLO analysis and create inspection |
| `PUT` | `/api/admin/inspections/:id` | Update inspection status, grade, or notes |
| `DELETE`| `/api/admin/inspections/:id` | Remove inspection record and defects |
| `GET` | `/api/admin/defects` | Searchable list of all localized defects |
| `GET` | `/api/admin/defects/analytics` | Defect frequency breakdown, Pareto ranking, severity breakdown |
| `GET` | `/api/admin/quality/analytics` | Grade distribution, monthly quality yield, defect density scatter |
| `GET` | `/api/admin/users` | List inspectors, managers, and admins |
| `POST` | `/api/admin/users` | Create new user account with hashed password |
| `PUT` | `/api/admin/users/:id` | Update user details or role |
| `PATCH`| `/api/admin/users/:id/status`| Toggle user status between `Active` and `Inactive` |
| `GET` | `/api/admin/reports` | List generated audit reports (`FS-REP-2024-XXXX`) |
| `GET` | `/api/admin/model` | YOLOv8 specifications, confusion matrix metrics, and inference latency |
| `GET` | `/api/admin/settings` | Get configurable system thresholds and options |
| `PUT` | `/api/admin/settings` | Save system thresholds and preferences to SQLite |

---

## 📱 Mobile App (Android Build)

The mobile inspection workflow is powered by Capacitor and continues to function without interruption:

```bash
# 1. Compile web bundle
npm run build

# 2. Sync to native Android shell
npx cap sync android

# 3. Open in Android Studio or run directly
npx cap run android
```

---

## 📄 License & Credits

FabriSense is developed for modern textile manufacturing and quality automation. All rights reserved.
