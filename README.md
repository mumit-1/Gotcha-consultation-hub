<div align="center">

```
   ██████╗  ██████╗ ████████╗ ██████╗██╗  ██╗ █████╗
  ██╔════╝ ██╔═══██╗╚══██╔══╝██╔════╝██║  ██║██╔══██╗
  ██║  ███╗██║   ██║   ██║   ██║     ███████║███████║
  ██║   ██║██║   ██║   ██║   ██║     ██╔══██║██╔══██║
  ╚██████╔╝╚██████╔╝   ██║   ╚██████╗██║  ██║██║  ██║
   ╚═════╝  ╚═════╝    ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝
```

**A free peer-to-peer consultation marketplace for students.**

[![Built with React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Spark_Plan-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

[**Live Demo**](https://gotcha-bd.vercel.app) · [**Report a Bug**](https://github.com/your-username/gotcha/issues) · [**Request a Feature**](https://github.com/your-username/gotcha/issues)

</div>

---

## What is Gotcha?

Gotcha is a free consultation marketplace built for university students. Any verified user can act as both a **client** (looking for help) and a **consultant** (offering help). Sessions happen outside the app — via WhatsApp, Discord, or any platform you prefer. Gotcha handles **discovery, scheduling, booking, notifications, and reviews** — entirely in the browser, with zero server-side code.

> **100% free. No credit card. No cloud functions. No fees.**

---

## ✨ Features

| Feature                    | Details                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 🔐 **Auth**                | Email/password registration, email verification enforcement, password reset via Firebase                                      |
| 🧑‍💼 **Consultant Profiles** | Bio, skills, experience, courses, pricing (default FREE), photo via Cloudinary                                                |
| 📚 **500+ Courses**        | Searchable multi-select CourseSelector with every code from CSE to LAW to MAT                                                 |
| 🗓️ **Availability**        | Weekly recurring schedules in Bangladesh time (Asia/Dhaka, UTC+6), manual busy toggle, computed Available/Busy/Offline status |
| 🔍 **Find Consultants**    | Filter by course, name, availability, price; sort by rating; paginated; fast composite indexes                                |
| 📩 **Booking Flow**        | PENDING → ACCEPTED → IN_PROGRESS → COMPLETED state machine with slot-lock double-booking protection                           |
| 🔒 **Slot Locks**          | Firestore transaction locks every 30-min block; two overlapping accepts can never both succeed                                |
| 🤖 **Lazy Sweeper**        | Browser-side background process auto-cancels expired/overlapping requests and persists time-derived statuses                  |
| 📧 **Emails**              | EmailJS for 6 email types (request, accepted with WhatsApp link, rejected, cancelled, auto-cancelled, completed)              |
| 🏠 **Dashboard**           | TODAY timeline, pending requests panel, upcoming sessions, quick navigation                                                   |
| 🔔 **Notifications**       | Real-time in-app notification center with mark-as-read                                                                        |
| ⭐ **Reviews**             | 1–5 star ratings + written reviews; consultant rating computed via Firestore transaction                                      |
| 🚩 **Reports & Blocks**    | 6 report types; blocked users cannot book each other                                                                          |
| 🛡️ **Admin Panel**         | User/consultant management, report queue, booking overview, platform settings                                                 |
| 🎨 **Neo-Brutalism UI**    | Space Grotesk font, hard black borders, offset solid shadows, Framer Motion animations                                        |
| 📱 **Fully Responsive**    | Mobile-first, works on all screen sizes                                                                                       |
| 🔍 **SEO**                 | Full meta tags, Open Graph, Twitter Card, JSON-LD schema, sitemap.xml, robots.txt                                             |

---

## 🛠️ Tech Stack

| Layer             | Technology                                                |
| ----------------- | --------------------------------------------------------- |
| Frontend          | React 19, Vite 8, Tailwind CSS 3                          |
| Routing           | React Router DOM v7                                       |
| Backend           | Firebase (Auth + Firestore) — Spark free plan only        |
| Animations        | Framer Motion, react-countup, react-intersection-observer |
| UI                | lucide-react, react-hot-toast, react-fast-marquee         |
| Photos            | Cloudinary (unsigned upload preset, free tier)            |
| Emails            | EmailJS browser SDK (free tier, 200 emails/month)         |
| Dates             | date-fns                                                  |
| Image compression | browser-image-compression                                 |
| Hosting           | Vercel (primary) + Firebase Hosting (optional)            |

---

## 📁 Project Structure

```
src/
├── assets/
├── components/
│   ├── auth/           EmailVerificationBanner, ProtectedRoute
│   ├── availability/
│   ├── booking/
│   ├── consultants/
│   ├── courses/        CourseSelector (reusable searchable multi-select)
│   ├── dashboard/
│   ├── layout/         Navbar, Footer, PageLayout
│   ├── profile/        PhotoUpload, ProfileEditor
│   ├── reports/        ReportModal
│   ├── reviews/        ReviewModal, StarRating
│   └── ui/             Button, Input, Textarea, Select, Badge, Avatar,
│                       Spinner, Modal, AnimatedSection
├── contexts/
│   └── AuthContext.jsx
├── data/
│   └── courses.js      ← SINGLE SOURCE OF TRUTH (500+ course codes)
├── hooks/
│   └── useSweeper.js   ← Lazy sweeper (auto-cancel, status sync)
├── lib/
│   ├── bookingService.js   All booking state transitions + slot locks
│   ├── cloudinary.js       Image compress + upload
│   ├── emailjs.js          All 6 email senders + throttle
│   ├── firebase.js         Firebase app init
│   └── verifiedWrites.js   Fresh verified tokens, missing user-doc recovery, and write retry
└── pages/
    ├── Admin/          AdminDashboard
    ├── Auth/           Login, Register, ResetPassword
    ├── Availability.jsx
    ├── BecomeConsultant.jsx
    ├── BookSession.jsx
    ├── ConsultantProfile.jsx
    ├── Dashboard.jsx
    ├── FindConsultants.jsx
    ├── Landing.jsx
    ├── MyConsultations.jsx
    ├── Notifications.jsx
    └── Profile.jsx

firestore.rules           Firestore security rules
firestore.indexes.json    9 composite indexes
firebase.json             Firebase Hosting config
vercel.json               SPA rewrite rules
scripts/seedCourses.js    One-time course list seeder
public/
├── favicon.svg
├── robots.txt
└── sitemap.xml
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase project](https://console.firebase.google.com) (free Spark plan)
- A [Cloudinary account](https://cloudinary.com) (free tier)
- An [EmailJS account](https://emailjs.com) (free tier)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/gotcha.git
cd gotcha
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in `.env` with your keys:

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=   # must be an UNSIGNED preset

# EmailJS
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_PUBLIC_KEY=
VITE_EMAILJS_TEMPLATE_REQUEST=
VITE_EMAILJS_TEMPLATE_ACCEPTED=
VITE_EMAILJS_TEMPLATE_REJECTED=
VITE_EMAILJS_TEMPLATE_CANCELLED=
VITE_EMAILJS_TEMPLATE_AUTOCANCELLED=
VITE_EMAILJS_TEMPLATE_COMPLETED=
```

### 3. Firebase Setup

In [Firebase Console](https://console.firebase.google.com):

1. **Authentication** → Sign-in methods → Enable **Email/Password**
2. **Firestore** → Create database (production mode)
3. **Deploy rules & indexes:**

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes
```

The Firestore rules restrict booking changes to valid participant transitions, keep contact records owner-only, and only allow a completed booking to be reviewed once by each participant. Admin access is granted by creating an `admins/{uid}` document outside the client app.

### 4. Course List

The 549 course codes are loaded from [`src/data/courses.js`](src/data/courses.js) by the app. Consultant profiles can offer up to 50 courses, and selections are checked against `config/courses.codes` in both the app and Firestore rules. An admin must use **Admin → Settings → Seed Courses** to copy the central catalog to `config/courses.codes` before consultant profiles can be saved. The admin action compares the existing list with the local catalog, writes all codes, and verifies the saved result.

### 5. Create the First Admin

1. Register normally at `/register`
2. Firebase Console → Authentication → copy your UID
3. Firestore → create `admins/{yourUID}` document (any field, e.g. `{ "admin": true }`)
4. Log out and back in → "Admin Panel" appears in the nav menu

### 6. Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. [Import repo on Vercel](https://vercel.com/new)
3. Add all `VITE_` environment variables in Vercel dashboard
4. Deploy — `vercel.json` handles SPA routing automatically

```bash
# Or via CLI
npx vercel --prod
```

### Firebase Hosting (Alternative)

```bash
npm run build
npx firebase deploy --only hosting
```

> Update the canonical URL in [`index.html`](index.html) and [`public/sitemap.xml`](public/sitemap.xml) after deployment.

---

## 🔒 Security Model

Gotcha has **no server**. All security is enforced in Firestore rules:

| Rule                         | Description                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `email_verified`             | Unverified users cannot create bookings or consultant profiles                        |
| `notSuspended()`             | Suspended/banned users are blocked from all writes                                    |
| Local course catalog         | Consultant course choices come from `src/data/courses.js`; no Firestore seed required |
| Slot lock `create-if-absent` | Prevents double-acceptance of overlapping bookings                                    |
| Booking participant check    | Only the two participants can read/update a booking                                   |
| Admin collection             | `admins/{uid}` existence check; write is `false` (console only)                       |
| Protected fields             | Users cannot write their own `status`, `ratingSum`, `isVerified`, or `isConsultant`   |

---

## 📧 EmailJS Templates

Create 6 templates in EmailJS. Each template must include the variable names below (wrap in `{{double_braces}}`):

| Template Env Var         | Key Variables                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `TEMPLATE_REQUEST`       | `to_email`, `to_name`, `from_name`, `course`, `topic`, `date`, `time`, `duration`, `price`, `booking_id`                        |
| `TEMPLATE_ACCEPTED`      | `to_email`, `to_name`, `consultant_name`, `course`, `topic`, `date`, `time`, `duration`, `price`, `whatsapp_link`, `booking_id` |
| `TEMPLATE_REJECTED`      | `to_email`, `to_name`, `consultant_name`, `course`, `date`, `time`, `booking_id`                                                |
| `TEMPLATE_CANCELLED`     | `to_email`, `to_name`, `cancelled_by`, `course`, `date`, `time`, `reason`, `booking_id`                                         |
| `TEMPLATE_AUTOCANCELLED` | `to_email`, `to_name`, `other_name`, `course`, `date`, `time`, `reason`, `booking_id`                                           |
| `TEMPLATE_COMPLETED`     | `to_email`, `to_name`, `other_name`, `course`, `date`, `booking_id`                                                             |

---

## 🗄️ Firestore Data Model (Summary)

```
users/{uid}                     Public profile
users/{uid}/private/contact     WhatsApp (owner-only)
consultants/{uid}               Consultant profile + availability
bookings/{bookingId}            Full booking with status machine
slotLocks/{consultantId}_{ms}   30-min slot reservation (create-if-absent)
userLocks/{clientId}_{ms}       Client-side time lock
notifications/{uid}/items/{id}  In-app notifications
reviews/{bookingId}             Post-session ratings
reports/{reportId}              User reports queue
admins/{uid}                    Admin access list (console-only writes)
config/settings                 Platform settings
```

---

## ⚠️ Free Tier Limits & Mitigations

| Service          | Free Limit         | Approach                                         |
| ---------------- | ------------------ | ------------------------------------------------ |
| Firestore reads  | 50K/day            | Paginated queries, no broad listeners            |
| Firestore writes | 20K/day            | Writes only on user actions                      |
| EmailJS          | 200 emails/month   | 5-per-hour client throttle; failures shown in UI |
| Cloudinary       | 25GB storage       | Client-side compress to ≤300KB before upload     |
| Firebase Auth    | Unlimited on Spark | ✓                                                |
| Firebase Hosting | 10GB/month         | Use Vercel as primary                            |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

---

## 📄 License

MIT © Gotcha

---

<div align="center">

Built with ❤️ on the Firebase Spark free plan · No credit card required · No paid APIs

</div>
