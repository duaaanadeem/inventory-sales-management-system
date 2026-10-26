# Inventory & Sales Management System

A full-stack inventory and sales management application with a web dashboard, point-of-sale workflow, and PostgreSQL-backed API.

## Features

- Dashboard with sales, revenue, customer, product, and low-stock summaries
- Product catalog, categories, inventory levels, stock history, and image uploads
- Point of sale with cart, customer selection, payment methods, and invoices
- Customer and supplier management
- Purchase orders and stock receiving
- Reports, activity history, and notifications
- Cookie-based authentication, role-based access, and password-reset endpoints

New registrations receive the `staff` role. Create the first administrator with the backend admin setup command described below.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| API | Node.js, Express |
| Database | PostgreSQL (compatible with Neon) |
| Authentication | JSON Web Tokens in HTTP-only cookies |
| Hosting configuration | Render (API), Vercel (web app) |

## Repository layout

```text
.
├── backend/
│   ├── server.js
│   └── src/
│       ├── db/              # PostgreSQL schema, initializer, admin setup
│       ├── features/        # Auth, sales, inventory, products, reports, etc.
│       └── customers/
├── frontend/
│   ├── next.config.mjs      # API and upload proxy
│   └── src/
│       ├── components/
│       ├── lib/
│       └── pages/
├── render.yaml              # Render Blueprint for the API
└── README.md
```

## Prerequisites

- Node.js and npm
- A PostgreSQL database
- Git

## Local development

### 1. Configure the backend

Open a terminal in the repository and install the backend dependencies:

```powershell
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env`, then edit `backend/.env` with your database URL and two different, randomly generated JWT secrets. Each JWT secret must be at least 32 characters. Keep `.env` private; it is ignored by Git.

Required backend settings:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens |
| `JWT_REFRESH_SECRET` | Different secret used to sign refresh tokens |

Optional settings, including `PORT`, `FRONTEND_URL`, and email credentials for password resets, are documented in `backend/.env.example`.

### 2. Initialize the database only if it is empty

> **Important:** `npm run migrate` runs the full schema initializer. It is only for a new, empty database. It is not an incremental migration and must not be run against a database containing data. The initializer checks for existing tables and refuses to proceed if it finds any.

For a new, empty database only:

```powershell
npm run migrate
```

For an existing database, do not run this command. Back up the database and use a reviewed, incremental migration that matches its current schema.

### 3. Create an administrator

Add the following temporary settings to `backend/.env`, replacing the example values. Use a unique password of at least 12 characters:

```dotenv
ADMIN_NAME=Your Name
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-unique-password
```

Then, from the `backend` directory, run:

```powershell
npm run create-admin
```

After the command confirms success, remove `ADMIN_PASSWORD` from `.env`. The command creates an administrator only when that email is not already registered; it does not change an existing account.

### 4. Start the API

From the `backend` directory:

```powershell
npm run dev
```

The API listens on port `5000` by default. Check its health endpoint at <http://localhost:5000/api/health>. A healthy response confirms the API can connect to PostgreSQL.

### 5. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open <http://localhost:3000>. The Next.js rewrite proxies `/api` and `/uploads` requests to `http://localhost:5000` by default.

Stop a development server with **Ctrl+C** in its terminal before reinstalling dependencies. On Windows, a running Next.js process can lock native dependency files and cause `npm ci` to fail.

## Available commands

### Backend (`backend/`)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with nodemon |
| `npm start` | Start the API |
| `npm test` | Run Node's test runner |
| `npm run migrate` | Initialize an **empty** PostgreSQL database only |
| `npm run create-admin` | Create an administrator from temporary environment settings |

### Frontend (`frontend/`)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Type-check and build for production |
| `npm start` | Start the production Next.js server |

## Deployment

Deployments use the repository's Git branch, so commit and push the reviewed changes before creating the hosted services. Never commit `.env` files or credentials.

### Backend on Render

1. Create a Render Blueprint from this repository and select `render.yaml`.
2. Set the service's required environment variables in Render:
   - `DATABASE_URL`: the rotated Neon connection string
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: different random secrets, each at least 32 characters
   - `FRONTEND_URL`: the Vercel site's origin, for example `https://your-app.vercel.app`
   - `FRONTEND_URLS`: comma-separated allowed browser origins
3. Deploy the service and check `https://<render-service>/api/health`.
4. If an administrator needs to be created, set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` temporarily in Render, run `npm run create-admin` from the backend service environment, then remove those variables.

Do not run `npm run migrate` against the existing Neon database. Take a backup before applying any reviewed database migration.

### Frontend on Vercel

1. Import the repository into Vercel and set the project **Root Directory** to `frontend`.
2. Add `BACKEND_URL` to the Vercel project's Production environment (and Preview if needed). Set it to the Render service origin without a trailing slash, for example `https://your-api.onrender.com`.
3. Leave `NEXT_PUBLIC_API_URL` unset. The app uses same-origin `/api` requests, which Next.js proxies to Render.
4. Deploy the project, then set Render's `FRONTEND_URL` to the Vercel production origin.

## Security and operational notes

- Rotate any database credential that has been shared or exposed. Store database URLs and JWT secrets only in local ignored `.env` files or the hosting provider's environment settings.
- Password-reset email requires valid email-service credentials in the backend environment.
- Product images are stored on the API filesystem. Render's ephemeral filesystem does not provide durable image storage; configure object storage or a persistent disk before depending on uploaded images in production.
- Run `npm audit` in both `backend` and `frontend` to review dependency advisories. Review proposed package changes before applying them.
- The backend uses PostgreSQL functions and triggers for stock updates and other database behavior. Keep the schema and application migrations in sync.

## Contributing

1. Create a branch for your change.
2. Make and test the change locally.
3. Open a pull request with a concise description and validation results.
