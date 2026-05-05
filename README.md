<div align="center">
  <img src="https://img.icons8.com/?size=100&id=46101&format=png&color=C9A84C" alt="Elite Dental Studio Logo" width="100"/>
  
  # Elite Dental Studio EMR 🦷
  
  *A Next-Generation, Real-Time Electronic Medical Record (EMR) Platform tailored for modern Dental Clinics.*
  
  [![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?logo=next.js)](https://nextjs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-DB_%26_Auth-3ECF8E?logo=supabase)](https://supabase.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
</div>

---

## 🌟 Executive Summary

**Elite Dental Studio EMR** is a premium, bespoke Electronic Medical Record (EMR) solution tailored exclusively for individual dental practices. Unlike generic Multi-Tenant SaaS platforms, this system is deployed on a **Single-Tenant architecture**. This means each clinic receives its own isolated database, custom branding (logo and color themes), and bespoke feature flags tailored to their specific workflow.

Designed to replace fragmented, legacy desktop software, this platform bridges the communication gap between the **Front Desk Reception** and the **Doctor's Operatory** in real-time. By providing complete data sovereignty and a custom-tailored experience, it dramatically increases patient throughput and minimizes administrative overhead.

By eliminating physical handoffs, automating billing synchronization, and providing a dynamic digital prescription engine, Elite Dental Studio dramatically increases patient throughput, minimizes administrative overhead, and maximizes financial accuracy—providing massive business value for modern dental enterprises.

---

## 🚀 Tech Stack

Engineered for extreme performance and instantaneous state synchronization, utilizing the modern React Server Components paradigm:

- **Framework**: [Next.js 16.2.4](https://nextjs.org/) (App Router, Server Actions, Turbopack)
- **Language**: TypeScript (Strict Mode)
- **Database & Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`, `@supabase/ssr`)
- **Styling**: Tailwind CSS v4 (Custom Glassmorphism & Gold/Dark UI Tokens)
- **Icons**: `lucide-react`
- **Notifications**: `sonner` (Toast notifications)
- **Real-time Sync**: Supabase Realtime (PostgreSQL WebSockets)

---

## 💎 Core Features

### 1. Role-Based Access Control (RBAC) & Secure Layouts
- **Distinct Portals**: Granular security partitions user sessions into strictly guarded `/doctor` and `/receptionist` layout routes.
- **Middleware Protection**: Next.js Edge Middleware ensures non-authenticated or cross-role navigation is instantly blocked and redirected.

### 2. Real-Time Clinic Orchestration (WebSockets)
- **Arrival Notifications**: When the Receptionist checks a patient in to the `WAITING` state, the Doctor instantly receives a live toast notification with a unique audio chime and a real-time count of total waiting patients.
- **Enter Room Alerts**: When the Doctor presses "Start Session" inside the clinic room, the Receptionist instantly receives a "Send Patient In" audio/visual alert detailing the exact patient and doctor pairing.
- **Live Queue Sync**: The `QueuePanel` universally tracks appointment statuses (`SCHEDULED`, `WAITING`, `IN_SESSION`, `COMPLETED`) across all screens simultaneously without manual refreshing.

### 3. Financial Workflow & Automated Billing
- **Atomic Billing Sync**: Upon a Doctor marking an appointment as `COMPLETED`, the cost of the executed services is calculated and immediately broadcasted to the front desk via a WebSocket `BillingNotifier`.
- **Intelligent Balance Tracking**: The system autonomously tracks historical outstanding balances, summing prior debt with the current visit's cost, preventing revenue leakage.
- **Receptionist Payment Collection**: The receptionist safely inputs the collected amount, securely finalizing the financial transaction and zeroing the debt ledger.

### 4. Advanced Clinical Registry & Patient EMR
- **Patient Timelines**: Doctors have access to a rich timeline interface detailing every past visit, diagnosis, applied treatments, and historical prescriptions.
- **Interactive Calendar**: Full timezone-aware (Africa/Cairo) scheduling dashboard with daily analytics, categorizing patient flow seamlessly.

### 5. Dynamic Prescription Builder & Print Engine
- **Smart 4-Field Grid**: Replaces clunky text areas with a robust UI to input *Medication*, *Amount*, *Frequency*, and *Duration*.
- **Sentence Generation**: Automatically parses the JSON payload into human-readable, grammatically correct clinical instructions (e.g., *"Augmentin 1g: Take 1 pill(s) every 12 hours for 5 days."*).
- **Print Layout**: Includes a dedicated, heavily styled, print-friendly CSS layout allowing Doctors to instantly generate a professional, branded prescription ready for the patient to take to the pharmacy.

---

## 📂 Architecture Overview

```text
elite-dental-emr/
├── src/
│   ├── app/
│   │   ├── actions.ts           # Highly secure Server Actions bypassing client-side data mutations
│   │   ├── globals.css          # Core CSS variables, Tailwind configuration, and @print rules
│   │   ├── doctor/              # Doctor Portal (Dashboard, Calendar, Patient Registry)
│   │   ├── receptionist/        # Front Desk Portal (Queue Management, Patient Intake)
│   │   └── login/               # Authentication Entry
│   ├── components/
│   │   ├── ArrivalNotifier.tsx  # WebSocket Listener: Alerts Doctor of arrivals
│   │   ├── EnterNotifier.tsx    # WebSocket Listener: Alerts Front Desk to send patient in
│   │   ├── BillingNotifier.tsx  # WebSocket Listener: Synchronizes checkout and payments
│   │   ├── QueuePanel.tsx       # Universal, live-syncing daily appointment tracker
│   │   ├── InteractiveCalendar.tsx 
│   │   └── Sidebar.tsx          # Dynamic Navigation based on User Role
│   └── lib/
│       ├── supabase.ts          # Supabase client instantiation (Admin & Client)
│       └── types.ts             # Global TypeScript interfaces for database schema
├── public/                      # Static assets
├── next.config.ts               # Next.js & Turbopack configurations
└── package.json                 # Project dependencies and scripts
```

---

## ⚙️ Local Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/amrfahmy0/elite-dental-emr.git
cd elite-dental-emr
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory. You must supply your Supabase project credentials for authentication, database access, and real-time syncing to function.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
*(Note: The `SUPABASE_SERVICE_ROLE_KEY` is strictly used server-side within Next.js Server Actions to safely bypass RLS during atomic financial and schedule mutations).*

### 4. Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`. You will be directed to the login portal. 

### 5. Database Initialization
This project requires specific PostgreSQL tables to function properly.
1. Open your Supabase project dashboard.
2. Navigate to the **SQL Editor**.
3. Run the SQL commands provided in the `database/schema.sql` file (or your schema creation script) to initialize the `users`, `appointments`, and `visits` tables along with their respective Row Level Security (RLS) policies.

### 6. Test Credentials
Once the database is set up and the development server is running, you can use the following dummy credentials to test the Role-Based Access Control (RBAC):

**Doctor Portal (`/doctor`):**
- **Email:** doctor@elitedental.com
- **Password:** password123

**Receptionist Portal (`/receptionist`):**
- **Email:** reception@elitedental.com
- **Password:** password123

---

## 🚀 Deployment (Per-Clinic Setup)

Because this is a bespoke, single-tenant solution, deployment is repeated for each new clinic to ensure 100% data isolation and brand customization.

1. **Provision Database:** Create a new project in your Supabase Organization for the specific clinic.
2. **Deploy UI:** Click the button below to deploy the Next.js application to Vercel.
   
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/amrfahmy0/elite-dental-emr)

3. **Configure Environment:** During the Vercel deployment flow, input the newly generated Supabase keys for that specific clinic.
4. **Customize Branding:** Update the CSS variables in `globals.css` (or the clinic's config table) to match their specific brand identity before handing over the domain.

---

*Designed and engineered to revolutionize the daily operations of Elite Dental Studio.*
