# BlaBlaRide — Use Cases & Usage Guide

BlaBlaRide is a ride-hailing / carpooling platform (backend: Node.js + TypeScript +
PostgreSQL + Redis + Socket.io; frontend: React Native / Expo). This guide covers
what the app does, how to run it, and how to use its features.

## 1. What it does (use cases)

| Area | Use case |
|---|---|
| Auth | Phone/email OTP login via Firebase, sign up as rider or driver, link social accounts, email verification |
| Driver onboarding | Submit KYC (Aadhar) + ID-proof upload, driver verification review |
| Carpooling | Drivers **publish** a ride (route, seats, price); riders **search** for matching rides |
| On-demand rides | Rider **requests** a ride, a driver **accepts** it |
| Trip planning | Fare estimate, place/address search, AI destination suggestions, personalized recommendations, voice-to-booking ("book me a ride to the airport tomorrow 9am") |
| Scheduling | Schedule a future ride, cancel a ride, recurring/daily-commute rides |
| Live experience | Real-time driver location tracking, in-app chat between driver & rider (Socket.io) |
| Safety | One-tap SOS, emergency contacts, trust/verification scoring |
| Payments & wallet | Pay for a ride, in-app wallet balance, add money, transaction history, invoices |
| Growth & retention | Referral program, coupons/campaigns ("Offers"), badges/achievements, ratings & reviews |
| Support | Raise and track support tickets |
| Admin/ops | Platform stats dashboard, audit logging of sensitive actions |

## 2. Repository layout

```
ride-hailing/
├── backend/        Node.js + TypeScript API (Express, TypeORM, Postgres, Redis, Socket.io)
└── frontend/        React Native (Expo) mobile app
```

## 3. Running the backend

### 3a. With Docker (recommended — brings up API + Postgres + Redis + backups)

```bash
cd backend
docker compose up --build
```
This starts:
- `backend` on **http://localhost:5000**
- `db` — Postgres 15 on `5432`
- `redis` — Redis 7 on `6379`
- `db_backup` — hourly `pg_dump` backups (via `scripts/backup.sh`)

### 3b. Running locally (without Docker)

```bash
cd backend
cp .env.example .env     # then fill in real values
npm install
npm run migration:run    # apply DB migrations
npm run dev               # nodemon + ts-node, auto-reload
# or: npm start           # one-shot ts-node
```

Required environment variables (`backend/.env`):

```
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/blablaride
JWT_SECRET=<your-secret>
FIREBASE_PROJECT_ID=<firebase-project-id>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=<firebase-service-account-email>
```
(Also used elsewhere: `STRIPE_*` for payments, `REDIS_URL` for caching/geo queries.)

### Backend scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start API with hot-reload |
| `npm start` | Start API (no reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run Jest test suite |
| `npm run migration:generate` | Generate a new TypeORM migration from entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Roll back the last migration |

### API docs
Once running, interactive Swagger docs are at **http://localhost:5000/api-docs**.
Health check: `GET /api/health`.

## 4. Running the frontend (mobile app)

```bash
cd frontend
npm install
npm start           # opens Expo dev tools / QR code
npm run android      # run on Android emulator/device
npm run ios          # run on iOS simulator/device
npm run web          # run in browser
npm test             # run Jest tests
```

Point the app at your backend by editing `frontend/src/api/config.ts` (base URL),
and make sure `frontend/src/utils/firebase.ts` has your Firebase web config
(same Firebase project as the backend, for OTP login).

## 5. Core API reference (base path `/api`)

### Auth — `/api/auth`
| Method & path | Purpose |
|---|---|
| `POST /verify-otp` | Verify Firebase ID token → login or create account (`role: user \| driver`) |
| `POST /driver-verification` 🔒 | Submit driver verification details |

### Rides — `/api/rides` (🔒 = requires `Authorization: Bearer <token>`)
| Method & path | Purpose |
|---|---|
| `POST /request` 🔒 | Request an on-demand ride (pickup/destination coords + fare) |
| `POST /accept/:rideId` 🔒 | Driver accepts a requested ride |
| `POST /publish` 🔒 | Driver publishes a carpool ride offer |
| `GET /search` 🔒 | Search carpool rides matching a route |
| `GET /suggestions` 🔒 | AI-powered destination suggestions |
| `POST /voice-parse` 🔒 | Parse natural-language text into a booking intent |
| `POST /pay` 🔒 | Pay for a ride |
| `GET /search-places` 🔒 | Address/place autocomplete search |
| `GET /recommendations` 🔒 | Personalized ride recommendations |
| `POST /fare-estimate` 🔒 | Estimate fare for a route |
| `POST /schedule` 🔒 | Schedule a future/recurring ride |
| `POST /cancel` 🔒 | Cancel a ride |

### Reviews — `/api/reviews`
| Method & path | Purpose |
|---|---|
| `POST /` 🔒 | Rate & review a ride participant (1–5 stars + comment) |
| `GET /user/:userId` | Get a user's reviews |

### Platform — `/api/platform`
| Method & path | Purpose |
|---|---|
| `GET /stats` | Public platform stats |
| `POST /verify-kyc` 🔒 | Submit KYC (Aadhar) for verification |
| `POST /referral` 🔒 | Set up/apply a referral code |
| `POST /support/tickets` 🔒 | Open a support ticket |
| `GET /support/tickets` 🔒 | List your support tickets |

### Wallet — `/api/wallet`
| Method & path | Purpose |
|---|---|
| `GET /balance` 🔒 | Get wallet balance |
| `POST /add` 🔒 | Add money to wallet |
| `GET /transactions` 🔒 | Transaction history |

### Upload — `/api/upload`
| Method & path | Purpose |
|---|---|
| `POST /id-proof` | Upload an ID-proof image (multipart, field `idProof`) for KYC |

### Real-time (Socket.io)
The server initializes Socket.io for:
- **Live tracking** — driver location streamed to the rider during a trip
- **Chat** — in-app driver↔rider messaging

## 6. Mobile app screens (navigation flow)

```
Login
 └─ Home (bottom tabs)
     ├─ Rides (book/search a ride)
     ├─ Offers (coupons & campaigns)
     ├─ History (past trips)
     ├─ Support (help & tickets)
     └─ Profile
Other screens reachable from Home/flows:
 Payment · Wallet · Invoice · LiveTracking · Chat · Preferences
 (music/smoking/pets/ladies-only/chattiness) · SOS · Achievements
 (badges/gamification) · Referral · DriverVerification · Admin (ops dashboard)
```

## 7. Typical end-to-end flows

**Rider books a carpool ride**
1. Login (`/auth/verify-otp`) → 2. search for a ride (`/rides/search-places`, `/rides/search`)
→ 3. (optional) get a fare estimate (`/rides/fare-estimate`) → 4. request/join a ride
(`/rides/request`) → 5. pay (`/rides/pay` or wallet) → 6. track driver live (Socket.io) and
chat → 7. rate the ride (`/reviews`).

**Driver offers a ride**
1. Login as driver → 2. complete KYC + ID-proof upload (`/platform/verify-kyc`,
`/upload/id-proof`) and driver verification (`/auth/driver-verification`) → 3. publish a
route (`/rides/publish`) → 4. accept incoming requests (`/rides/accept/:rideId`) →
5. drive, chat, get rated.

**Safety**
At any point during a ride, the rider/driver can hit SOS (`SOSScreen`) to alert emergency
contacts with live location.

## 8. Testing

```bash
cd backend && npm test     # Jest: auth, pricing, etc.
cd frontend && npm test     # Jest: LoginScreen, fare utils, etc.
```

## 9. Deployment notes

- `backend/Dockerfile` + `docker-compose.yml` containerize the API, Postgres, and Redis.
- `backend/scripts/deploy.sh` and `backend/scripts/backup.sh` handle deployment and
  automated hourly Postgres backups (7-day retention target).
- GitHub Actions workflows under `.github/` run CI (test + build verification).
