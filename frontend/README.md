# Frontend — Inventory & Sales Management System

Responsive frontend for a business management dashboard built with **Next.js 14**, **React 18**, **Tailwind CSS**, and **Recharts**.

> **Note:** This is the *frontend* portion of a group project. Backend, database, authentication, and business logic (sales, inventory, reports, etc.) are handled by other team members. This README documents the **Responsive Design** contribution.

---

## 👩‍💻 My Part — Responsive Design

**Assigned to:** Fatima Javed

**Scope:**
- Responsive layout for Desktop, Tablet, and Mobile
- Tablet-friendly POS UI
- Reusable responsive components (tables, forms, modals, cards, charts)
- Responsive shell that all other team members plug their pages into

---

## 🎯 What I Built

### 1. Responsive Layout Shell
The app-wide layout that wraps every page. Consists of:
- **`DashboardLayout.tsx`** — main layout wrapper (sidebar + header + content area)
- **`Sidebar.tsx`** — collapsible navigation (slide-in drawer on mobile/tablet, fixed on desktop)
- **`Header.tsx`** — responsive top bar with search, notifications, and user menu

Every teammate's page is wrapped in `<DashboardLayout>` so responsiveness is automatic.

### 2. Reusable Responsive Components

| Component | Purpose | Responsive Behavior |
|---|---|---|
| `ResponsiveTable.tsx` | Data tables | Table on `md+`, card list on mobile |
| `Modal.tsx` | Dialogs | Bottom sheet on mobile, centered on `sm+` |
| `ProductForm.tsx` | Forms | 1-column mobile → 2-column tablet/desktop |
| `StatCard.tsx` | Dashboard stat tiles | Auto-columns, hover lift |
| `SalesChart.tsx` | Line chart | Auto-resizes via `ResponsiveContainer` |

### 3. Tablet-Friendly POS UI
The POS screen (`app/pos/page.tsx`) is designed for tablet use:
- **Split layout** on `lg+` (products left, cart right), **stacked** on mobile
- **56px minimum touch targets** (`.pos-touch` utility)
- Product grid: 2 cols (mobile) → 3 cols (tablet) → 4 cols (desktop)
- Fixed-height product tiles so long names never overflow
- Large quantity buttons, one-tap payment method selectors

### 4. Custom Responsive CSS
Defined in `app/globals.css` using Tailwind v4 `@theme` and `@layer components`:
- `.container-responsive` — consistent horizontal padding across breakpoints
- `.card` — soft-shadow card with responsive padding
- `.input` — 44px minimum height touch-friendly inputs
- `.btn-primary`, `.btn-secondary` — responsive buttons with focus rings
- `.pos-touch` — 56px minimum touch target for POS
- Custom `xs` (375px) breakpoint for small phones

### 5. Theme
- **Sidebar:** dark slate (`#0f172a`) — premium, high-contrast
- **Primary:** indigo (`#4f46e5`) — used for buttons, active nav, chart line
- **Background:** slate-50 — soft, not stark white
- **Surface:** white cards with subtle borders + shadows
- **Status colors:** emerald (success), amber (warning), rose (danger)

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Target Device |
|---|---|---|
| `xs` | 375px | Small phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets (portrait) |
| `lg` | 1024px | Tablets (landscape) / small laptops |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI Library | React 18 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Forms | React Hook Form |
| Language | TypeScript |

---

## 📁 Project Structure

frontend/
├── app/
│ ├── globals.css ← Tailwind v4 theme + responsive component classes
│ ├── layout.tsx ← Root layout with viewport config
│ ├── page.tsx ← Redirects to /dashboard
│ ├── dashboard/
│ │ └── page.tsx ← Dashboard page (responsive grid + chart)
│ ├── products/
│ │ └── page.tsx ← Products page (uses ResponsiveTable)
│ ├── pos/
│ │ └── page.tsx ← Tablet-friendly POS UI
│ ├── inventory/
│ │ └── page.tsx ← Placeholder (owner: Muhammad Ali)
│ ├── customers/
│ │ └── page.tsx ← Placeholder (owner: Omaima Atif)
│ ├── suppliers/
│ │ └── page.tsx ← Placeholder (owner: Kashif Hayat)
│ ├── purchases/
│ │ └── page.tsx ← Placeholder (owner: Kashif Hayat)
│ └── reports/
│ └── page.tsx ← Placeholder (owner: Qasim Zahoor)
├── components/
│ ├── layout/
│ │ ├── DashboardLayout.tsx ← Page shell wrapper
│ │ ├── Sidebar.tsx ← Collapsible nav
│ │ └── Header.tsx ← Top bar
│ ├── dashboard/
│ │ ├── StatCard.tsx ← Stat tile
│ │ └── SalesChart.tsx ← Auto-resizing chart
│ ├── forms/
│ │ └── ProductForm.tsx ← Responsive form pattern
│ ├── tables/
│ │ └── ResponsiveTable.tsx ← Table → cards on mobile
│ └── ui/
│ └── Modal.tsx ← Responsive modal
├── public/
├── next.config.ts
├── postcss.config.mjs ← Tailwind v4 PostCSS setup
├── tsconfig.json
├── package.json
└── README.md

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17+ (or 20+)
- npm / yarn / pnpm

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev