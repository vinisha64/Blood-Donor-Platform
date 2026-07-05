# LifeLink — Blood Donor–Recipient Matching Platform

A full-stack MERN app connecting hospitals with nearby blood donors using real
geolocation search, a request/notification workflow, and an admin panel.

## Features (all working end-to-end)

- **Donor registration** with blood group, age, gender, and GPS location (browser geolocation or manual lat/lng).
- **Hospital registration** with license number; hospitals start **unverified** until an admin approves them.
- **Geospatial donor search** — hospitals search donors within a radius (5–100km) filtered by blood group and availability, using MongoDB's `$near` geospatial query (real distance sorting, not a mock). Hospitals can also search from a **different location** than their registered address (e.g. a branch site).
- **Interactive map** — search results render as pins on a Leaflet/OpenStreetMap view with a radius circle, alongside the list.
- **Request workflow** — hospital sends a request to a specific donor → donor gets a notification → donor accepts/declines → hospital sees the live status → hospital can **cancel** a still-pending request → hospital marks an accepted request "completed" → donor's `lastDonationDate` auto-updates and a 90-day cooldown is enforced/shown.
- **Notifications** — bell icon with unread count, polls every 15s, mark-as-read / mark-all-read.
- **Toast feedback** — every action (search, send, accept, decline, verify, delete, etc.) shows a confirmation or error toast, so it's always clear something happened.
- **Hospital & donor self-service profile editing** — both roles can update their own contact info and location after registering.
- **Admin panel** — dashboard stats (donors, hospitals, requests by status/blood group), verify/suspend/delete users, view all requests.
- **JWT authentication** with role-based access control (donor / hospital / admin) enforced on the backend, not just hidden in the UI.
- **Rate limiting** on auth endpoints (login/register) to slow down brute-force attempts.
- **90-day donation eligibility** calculated server-side and shown as a badge everywhere relevant.

## Design decisions that can look like "bugs" at first glance

- **"Send request" is disabled until an admin verifies the hospital.** This is intentional — it stops unverified accounts from contacting donors. The button now says **"Verification required"** instead of just looking greyed out, and clicking it (or trying anyway) shows a toast explaining why. Fix: log in as admin → Users tab → Verify.
- **"0 km away" for a donor** usually just means that donor really is at (or very near) the location you searched from — common when you register a hospital and a donor from the same browser/laptop using "Use my current location." It's not a distance-calculation bug; test with two genuinely different lat/lng pairs to see real distances.
- **Search returning the same results** isn't broken — it's re-running the same query. The dashboard now shows "**N donors found · updated HH:MM:SS**" next to the button, and a toast on every search, so it's obvious a fresh search happened even if the result list looks the same.

## Tech stack

- **Backend:** Node.js, Express, MongoDB + Mongoose (2dsphere geospatial index), JWT, bcrypt.
- **Frontend:** React 18 (Vite), React Router, Axios, plain CSS (no framework — custom design system).

## Project structure

```
blood-donor-platform/
├── backend/
│   ├── config/db.js
│   ├── models/         User.js, Request.js, Notification.js
│   ├── middleware/auth.js
│   ├── routes/          auth.js, donors.js, hospitals.js, requests.js, admin.js
│   ├── utils/           generateToken.js, seed.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js
        ├── context/      AuthContext.jsx, ToastContext.jsx
        ├── components/   Navbar, NotificationBell, LocationField, DonorMap, Badges, ProtectedRoute
        └── pages/        Home, Login, RegisterDonor, RegisterHospital,
                           DonorDashboard, HospitalDashboard, AdminDashboard
```

## Setup

### 1. Prerequisites
- Node.js 18+
- A MongoDB database — either:
  - **Local:** install MongoDB Community Server and run `mongod`, or
  - **Free cloud option:** create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and copy its connection string.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/blood_donor_db   # or your Atlas connection string
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Seed an admin account + sample donors/hospital (optional but recommended for testing):
```bash
npm run seed
```
This creates:
- Admin: `admin@seed.test` / `admin123`
- 5 sample donors in Bengaluru (password: `password123`)
- 1 pre-verified hospital: `cityhospital@seed.test` / `password123`

Start the server:
```bash
npm run dev      # with nodemon (auto-restart)
# or
npm start
```
Backend runs on `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
npm run dev
```
Frontend runs on `http://localhost:5173`.

## How to test the full flow

1. **Register a donor** at `/register/donor` — use "Use my current location" (allow browser location access) or enter lat/lng manually.
2. **Register a hospital** at `/register/hospital`.
3. Log in as the **seeded admin** (`admin@seed.test` / `admin123`) → Admin dashboard → Users tab → click **Verify** next to your hospital.
4. Log back in as the **hospital** → "Find donors" tab → search by blood group/radius → click **Send request** on a donor.
5. Log in as that **donor** → see the incoming request on the dashboard → **Accept** or **Decline**.
6. Log back in as the **hospital** → "Sent requests" tab → if accepted, click **Mark donation completed** — this updates the donor's last-donation date and starts their 90-day cooldown automatically.
7. Check the **notification bell** as each of these steps happens — both sides get notified in real time (15s poll).

## Notes on location data

For real deployments you'd typically geocode a typed address (e.g. via the free
Nominatim/OpenStreetMap API) into lat/lng. This build uses the browser's native
geolocation API plus a manual lat/lng fallback so it works without any external
API keys — you can swap in a geocoding call in `LocationField.jsx` later if you
want donors to type an address instead of coordinates.

## Security notes for production

- Rotate `JWT_SECRET` and never commit `.env` files.
- Add rate limiting (e.g. `express-rate-limit`) on `/api/auth/*`.
- Add HTTPS + secure cookie storage for tokens instead of `localStorage` if you want stronger XSS protection.
