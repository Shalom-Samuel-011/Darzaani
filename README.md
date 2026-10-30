# Darzaani

Darzaani is a tailoring atelier storefront and operations app. Customers browse garments, manage fit measurements, place orders, and book consultations. Branch managers handle branch orders and consultations, assign or reassign tailors, and track production. Tailors update their assigned production stages; master admins manage the platform across branches.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Express 5, MongoDB with Mongoose
- Payments: Razorpay Standard Checkout
- Geospatial branch selection: MongoDB 2dsphere indexes with `$geoNear` and `$near`
- CI: GitHub Actions runs backend tests, frontend lint/build/typecheck, and dependency audits

## Local development

Use Node.js 24. Install and start the backend:

```powershell
cd backend
npm ci
Copy-Item .env.example config.env
npm run start-dev
```

Fill in `backend/config.env` before starting. In another terminal, configure and start the frontend:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

The frontend runs at `http://localhost:3000`; the backend defaults to port `2000`.

## Demo accounts

These seeded accounts use the same demo password per role. The branch manager accounts are intentionally scoped to different branches.

| Role | Email | Password | Branch |
| --- | --- | --- | --- |
| Master admin | `admin@darzaani.com` | `Admin123` | All branches |
| Branch manager | `manager@darzaani.com` | `Manager123` | Connaught Place |
| Branch manager | `manager.south@darzaani.com` | `Manager123` | South Extension |
| Branch manager | `manager.gurgaon@darzaani.com` | `Manager123` | Cyber City |
| Tailor | `tailor@darzaani.com` | `Tailor123` | Connaught Place |
| Tailor | `asha.tailor@darzaani.com` | `Tailor123` | South Extension |
| Tailor | `rohan.tailor@darzaani.com` | `Tailor123` | Cyber City |
| Customer | `customer@darzaani.com` | `Customer123` | Customer storefront |

The Demo Customer can choose sample branch addresses at checkout. Those use the saved branch coordinates as the geospatial search origin; checkout still picks the closest branch that has every item available. Consultation booking offers nearby branches and, for the Demo Customer, a way to browse all demo branches.

To seed the shared database, run these from `backend` in order: `npm run seed:demo-users`, `npm run seed:branches`, `npm run seed:garments`, and `npm run seed:workflow-records`. The workflow seeder removes branchless legacy orders and consultations, so run it only against the intended demo database.

## Test payments

The deployed demo must use Razorpay **Test Mode** API keys. No real payment is made in Test Mode. In Razorpay Checkout, use a test UPI ID such as `success@razorpay` to simulate success or `failure@razorpay` to simulate failure. For cards, Razorpay documents `4100 2800 0000 1007` as a successful domestic Visa test number; use any future expiry date and a random CVV. See the [official Razorpay test payment instructions](https://razorpay.com/docs/payments/server-integration/python/integration-steps).

Never commit `backend/config.env`, `frontend/.env.local`, live credentials, or the Razorpay API secret. Only public client IDs and API URLs belong in frontend environment variables.

## Checks

```powershell
cd backend
npm test
npm audit --audit-level=moderate

cd ../frontend
npm run lint
npm run build
npm run typecheck
npm audit --audit-level=moderate
```

The GitHub Actions workflow runs these checks on pushes and pull requests. It does not deploy the app.
