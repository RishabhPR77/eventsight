# SponsorWise - Intelligent Event Sponsorship Platform

> **Undergraduate Research Project** · Madhav Institute of Technology and Science, Gwalior  
> Built by **Rishabh Patidar** (ML Engineer / Data Scientist) & **Sujal Hammad** (Backend Developer)

SponsorWise is a full-stack AI-powered platform that helps event organizers in Madhya Pradesh find the right sponsors - and helps sponsors evaluate whether an event is worth their money. At its core is a two-stage XGBoost pipeline that predicts event attendance and sponsorship acceptance probability, augmented by LLM-generated insights, negotiation strategies, and cold outreach emails.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [ML Service (Rishabh Patidar)](#ml-service)
- [Backend (Sujal Hammad)](#backend)
- [Frontend (Joint Work)](#frontend)
- [Dataset](#dataset)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Team](#team)

---

## Problem Statement

Small and mid-scale event organizers in Tier-2 and Tier-3 cities of Madhya Pradesh struggle to secure sponsors because:

- They have no data-backed way to estimate attendance or ROI before approaching brands.
- Sponsors have no reliable signal to evaluate whether an event is worth sponsoring.
- Cold outreach is generic, and deal negotiation is done blind.

SponsorWise solves this by acting as an intelligent matchmaker - giving organizers predictions, insights, and tools to pitch better, and giving sponsors a data-driven view before they commit.

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│         (Vite + Tailwind + Socket.io-client)         │
└──────────────┬──────────────────────────┬───────────┘
               │ REST API                 │ WebSocket
               ▼                          ▼
┌──────────────────────────┐    ┌─────────────────────┐
│   Node.js / Express      │    │   Socket.io Server  │
│   Backend (Sujal)        │    │   (Real-time Chat)  │
│   MongoDB + Mongoose     │    └─────────────────────┘
│   JWT + OTP Auth         │
│   Cloudinary + Nodemailer│
└──────────────┬───────────┘
               │ HTTP (X-API-Key)
               ▼
┌──────────────────────────────────────────────────────┐
│              FastAPI ML Service (Rishabh)             │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Stage 1: XGBoost Attendance Predictor          │ │
│  │  Stage 2: XGBoost Sponsor Acceptance Classifier │ │
│  │  Groq LLM (gpt-oss-120b): Synergy + Insights   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, React Router v7, Socket.io-client, Axios |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose, JWT, bcryptjs, Nodemailer, Multer, Cloudinary, Socket.io, node-cron |
| **ML Service** | Python, FastAPI, XGBoost, scikit-learn, pandas, NumPy, Groq SDK, joblib, Pydantic v2, Uvicorn |
| **LLM** | Groq API - `openai/gpt-oss-120b` |
| **Infra** | Vercel (frontend), environment-configurable origins for backend and ML |

---

## Project Structure

```
SponsorWise/
├── src/                        # React frontend (joint work)
│   ├── components/
│   │   ├── ui/                 # Reusable UI: Card, Badge, Button, Stat, Separator
│   │   ├── layout/             # AppShell, TopNav, BrandPanel
│   │   ├── results/            # AiInsightsPanel, RecommendationsPanel,
│   │   │                       # ExecutiveSummary, OutreachPanel,
│   │   │                       # NegotiationPanel, ResultsPanel
│   │   ├── deal/               # DealPanel, OrganizerInputs
│   │   └── ChatBox.jsx         # Real-time sponsor↔organizer chat
│   ├── pages/                  # AuthGate, DashboardSwitch, OrganizerDashboard,
│   │                           # SponsorDashboard, SponsorWisePage,
│   │                           # SponsorAnalysisPage, OrganizerEventPage,
│   │                           # SponsorEventPage, AdminPage,
│   │                           # RegisterPage, VerifyOtpPage,
│   │                           # ForgotPasswordPage, ResetPasswordPage, SettingsPage
│   ├── context/                # AuthContext, ThemeContext
│   └── lib/                    # api.js, mlMappings.js, utils.js
│
├── backend/                    # Node.js REST + WebSocket server (Sujal)
│   └── src/
│       ├── controllers/        # auth, organizer, sponsor, admin
│       ├── models/             # User, Organizer, Sponsor, OTP, Conversation,
│       │                       # Message, EventCategory, EventFeedBack,
│       │                       # SponsorApplication, City, SponsorBrandTypes
│       ├── routes/             # auth, organizer, sponsor, admin, chat
│       ├── middleware/         # auth, admin, role-check, multer
│       ├── socket/             # chatSocket.js - real-time messaging
│       ├── jobs/               # eventExpiry.job.js - cron auto-expiry
│       ├── utility/            # ApiError, ApiResponse, AsyncHandler,
│       │                       # cloudinary, sendEmail, mlInputMapper
│       └── db/                 # MongoDB connection
│
└── ml-service/                 # FastAPI ML microservice (Rishabh)
    ├── main.py                 # Full pipeline - predictions + AI insights
    ├── train.ipynb             # Model training notebook
    ├── preprocess.ipynb        # Data preprocessing notebook
    ├── mp_sponsorwise_dataset.csv      # Raw synthetic dataset (~70k rows)
    ├── mp_sponsorwise_ml_features.csv  # Engineered feature set
    ├── feature_scaler.pkl              # Fitted StandardScaler (67 features)
    ├── stage1_attendance_xgboost.pkl   # Attendance prediction model
    ├── stage2_sponsor_xgboost.pkl      # Sponsorship acceptance classifier
    └── requirements.txt
```

---

## ML Service

**Created by Rishabh Patidar**

The ML service is a self-contained FastAPI microservice that exposes the prediction pipeline to the backend. It runs independently and is called by the Node.js backend via authenticated HTTP requests.

### Two-Stage XGBoost Pipeline

**Stage 1 - Attendance Predictor**  
Predicts expected event attendance given venue capacity, marketing budget, ticket price, organizer reputation, lineup quality, event type, city, date context, weather, and competition.

A clamping function converts raw model output to realistic fill-rate estimates tuned for Tier-2/3 MP city events. Fill never decreases as demand rises:
- Demand ≥ 1.4× capacity → cap at ~82% fill (true sellouts are rare)
- 0.7× ≤ demand < 1.4× → compress smoothly from 70% to 82% fill
- Demand < 0.7× → trust model output

**Stage 2 - Sponsorship Acceptance Classifier**  
Takes the scaled feature matrix from Stage 1 plus the raw attendance prediction as an additional feature (out-of-fold during training) and outputs:
- Binary acceptance prediction (will sponsor accept?)
- Acceptance probability (used to generate potential bands: HIGH / MEDIUM / LOW / UNLIKELY)

### Evaluation

Each event has 7 rows (one per candidate brand), so all splits are grouped by `event_id`; an event is never in both train and test. On a held-out 20% of events:

| Model | Metric | Score |
|---|---|---|
| Stage 1 (attendance) | R² | 0.922 |
| Stage 2 (feasibility) | Accuracy | 0.81 |
| Stage 2 (feasibility) | F1, feasible class | 0.73 |

The data is synthetic, so these scores describe how well the models recover the generator, not real-world accuracy.

### Feature Engineering (67 Features)

- **Calendar:** month, day of week, is_weekend, is_festive (set by the organizer per event)  
- **Weather:** temperature, humidity, is_raining (MP monthly defaults)  
- **Event:** type (one-hot), venue capacity, ticket price, marketing budget  
- **Organizer:** reputation score, lineup quality, social media reach, past events organized  
- **Competition:** expected competing events (city population × date context)  
- **Brand:** category (one-hot), annual budget, KPI type, city focus, activation maturity  
- **Fit:** brand-event synergy score (AI or math fallback)

### AI Layer - Groq LLM Integration

Two Groq API calls per `/predict` request:

1. **Pre-ML Synergy Score** - Asks the LLM to rate brand-event fit (0–100) based on audience alignment and thematic relevance. This score feeds directly into the ML feature matrix as `fit_score`.

2. **Post-ML Analysis Bundle** - After predictions are made, a single call generates:
   - Insights headline, explanation, key factors
   - Actionable next steps for the organizer
   - 2 negotiation points (objection + rebuttal pairs)
   - Cold outreach email written *from the sponsor to the organizer* (zero ML numbers in the email)

Pure-Python fallbacks exist for all AI outputs - the service is fully functional without Groq.

### Key Design Decisions

- **Canonical normalization** - all event types and brand categories are normalized via regex before lookup, fixing a bug where hyphenated strings like `"stand-up comedy"` were never matched.
- **No circular budget inflation** - `brand_annual_budget` is never derived from `sponsor_amount` to avoid input leakage.
- **API key auth** - protected routes require `X-API-Key` header; unauthenticated in local dev when key is unset. Only the backend holds the key: the browser reaches the ML service through `/api/ml/*`.
- **Reference categories** - `Apparel` and `Business Conference` were dropped by `get_dummies(drop_first=True)`, so they are valid inputs encoded as all zeros.
- **Request tracing** - every response carries `X-Request-ID` and `X-Response-Time-Ms` headers.
- **NumPy pickle shim** - handles cross-version compatibility when loading `.pkl` artifacts.

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness probe, model load status |
| POST | `/analyze-brand` | API Key | AI brand profile for setup screen |
| POST | `/predict` | API Key | Full two-stage prediction + AI insights |

---

## Backend

**Created by Sujal Hammad**

A Node.js + Express REST API that manages all application data, user authentication, file uploads, and real-time communication. It acts as the bridge between the frontend and the ML service.

### Features

**Authentication & Users**
- Role-based accounts: `organizer`, `sponsor`, `admin`
- OTP-based email verification on registration (5-minute expiry, 5 attempts per code)
- JWT access + refresh token pair, stored in HTTP-only cookies
- Forgot password / reset password via OTP email flow
- bcryptjs password hashing

**Organizer Domain**
- Create and manage events with image uploads to Cloudinary
- Review sponsor applications per event and accept or reject each one
- View ML-powered analysis results for their events
- Receive post-event feedback that feeds back into reputation scores; feedback opens only after the sponsorship is accepted, the event ends, and both sides confirm it happened
- Rate a sponsor's activation when confirming, which feeds that brand's future predictions
- Counter-offer with sponsors until one side accepts the other's latest amount
- See past events, sponsors, money raised and ratings on the History page
- Cancel an accepted deal, with a reason, until both sides have confirmed it

**Sponsor Domain**
- Browse events and apply for sponsorship (one application per upcoming event, with an offered amount and an optional message)
- Track application status from the dashboard
- View deal analysis powered by the ML service
- Access AI-generated negotiation points and cold email drafts
- Reuse a saved analysis for 7 days, so repeat views spend no Groq quota; any change to the event or brand gets a fresh one
- Cancel an accepted deal, with a reason, until both sides have confirmed it

**Real-time Chat** (Socket.io)
- Room-based messaging between sponsors and organizers scoped to a specific event
- Sockets and chat routes authenticate with the access-token cookie; only a conversation's two participants can read or send
- Inbox with unread counts, typing indicator, read receipts and image or PDF attachments (5 MB)
- The live offer shows inside the chat, and every offer and decision is recorded in the conversation

**Notifications**
- A bell for both sides, updated live over the socket, covering offers, counter-offers, decisions, messages, confirmations and feedback
- Global notification delivery to the recipient's personal room
- Email alerts for people who aren't on the site, with an off switch in Settings; a busy chat sends one email until it's read
- Persistent message history in MongoDB

**Automated Jobs** (node-cron)
- Runs every minute to auto-expire events past their date (status → `completed`, `isExpired: true`)
- Runs every hour to resolve stuck deals: if one side confirmed and the other is silent for 7 days the deal is confirmed automatically, and if neither side confirms within 30 days of the event it's closed

**Admin**
- Manage event categories, cities, sponsor brand types
- Platform-level oversight

### Database Models

`User` · `Organizer` (events) · `Sponser` (sponsor profiles) · `SponsorApplication` · `Prediction` (saved analyses) · `Notification` · `Conversation` · `Message` · `OTP` · `EventCategory` · `EventFeedBack` · `City` · `SponsorBrandTypes` · `Admin`

---

## Frontend

**Joint work by Rishabh Patidar & Sujal Hammad**

A React 19 SPA built with Vite and styled entirely with Tailwind CSS. The two dashboards (organizer and sponsor) share a common shell and component library.

### Key Pages & Components

- **AuthGate** - protects all authenticated routes, redirects to login if needed
- **DashboardSwitch** - renders `OrganizerDashboard` or `SponsorDashboard` based on user role
- **SponsorWisePage** - main analysis flow: enter event + brand details, get ML predictions
- **SponsorAnalysisPage** - full results view with tabbed panels (AI Insights, Recommendations, Executive Summary, Negotiation, Outreach)
- **OrganizerEventPage / SponsorEventPage** - event detail views with inline ChatBox
- **ResultsPanel / AiInsightsPanel / NegotiationPanel / OutreachPanel** - modular result components
- **ChatBox** - real-time Socket.io chat embedded in event pages
- **AdminPage** - category/city/brand-type management

---

## Dataset

The ML models were trained on a synthetic dataset of ~70,000 event-sponsor records representing the Madhya Pradesh event landscape.

| Property | Detail |
|---|---|
| Rows | ~70,000 |
| Features | 67 engineered features after one-hot encoding |
| Geography | 25 MP cities (Indore, Bhopal, Gwalior, Ujjain, ...) |
| Events × brands | 10,000 events, 7 candidate brands each, from a pool of 800 |
| Event types | 9 (Music Concert, Food Festival, College Fest, Cricket Screening, Sports Tournament, Tech Meetup, Business Conference, Standup Comedy, Religious/Cultural) |
| Brand categories | 10 (FMCG, Beverage, Fintech, Edtech, Automobile, Telecom, Apparel, Beauty/Personal Care, Local Retail, Real Estate) |
| Target 1 (Stage 1) | `actual_attendance` (regression) |
| Target 2 (Stage 2) | `feasible_to_sponsor` (binary classification) |

Weather defaults, festive months, city populations, and brand budget benchmarks are all calibrated to the MP regional context.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB (local or Atlas)
- Cloudinary account
- Groq API key (optional - service degrades gracefully without it)

### 1. ML Service

```bash
cd ml-service
pip install -r requirements.txt
# Copy .env.example to .env and fill in values
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Backend

```bash
cd backend
npm install
# Copy .env.example to .env and fill in values
npm run dev
```

### 3. Frontend

```bash
# From project root
npm install
npm run dev
```

---

## Environment Variables

### ML Service (`ml-service/.env`)

```
GROQ_API_KEY=           # Groq API key (optional)
GROQ_MODEL=openai/gpt-oss-120b
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
SERVICE_API_KEY=        # Shared secret with backend
PORT=8000
DEV_MODE=true
```

### Backend (`backend/.env`)

```
PORT=8080
DATABASE_URI=
ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=7d
CLIENT_ORIGIN=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
BREVO_API_KEY=          # Production email; EMAIL_FROM must be a verified Brevo sender
EMAIL_FROM=
EMAIL_USER=             # Local development only (Gmail SMTP)
EMAIL_PASSWORD=
ML_API_URL=http://localhost:8000
ML_API_KEY=             # Must match SERVICE_API_KEY in ML service
ADMIN_USERNAME=
ADMIN_PASSWORD=
```

### Frontend (`.env`)

```
VITE_BACKEND_BASE_URL=http://localhost:8080/api
```

Never put the ML API key in a `VITE_` variable: those are published in the browser bundle.

---

## Team

| | **Rishabh Patidar** | **Sujal Hammad** |
|---|---|---|
| **Role** | ML Engineer & Data Scientist | Backend Developer |
| **Created** | `ml-service/` - dataset design, feature engineering, XGBoost pipeline, FastAPI service, LLM integration | `backend/` - REST API, database schema, auth system, real-time chat, file uploads, cron jobs |
| **Shared Work** | React frontend (`src/`), system design, integration | React frontend (`src/`), system design, integration |
| **Institution** | Madhav Institute of Technology and Science, Gwalior | Madhav Institute of Technology and Science, Gwalior |
| **Project Context** | Undergraduate Minor Project | Undergraduate Minor Project |

---

## Acknowledgements

- [XGBoost](https://xgboost.readthedocs.io/) for the gradient boosting models
- [Groq](https://groq.com/) for fast LLM inference
- [FastAPI](https://fastapi.tiangolo.com/) for the ML service framework
- [Mongoose](https://mongoosejs.com/) and [Socket.io](https://socket.io/) for the backend infrastructure
- Madhav Institute of Technology and Science, Gwalior for supporting this project

---

*SponsorWise - Turning event data into sponsorship intelligence.*