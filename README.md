# MedConnect — AI-Powered Clinical Consultation Platform

A Progressive Web App that enables doctors to record patient consultations, auto-generate SOAP notes and prescriptions using AI, and let patients view their medical records with medication reminders.

## Features

- **Voice Recording** — Live transcription using Web Speech API
- **AI Processing** — SOAP notes & prescriptions via Ollama (Llama 3.2) running locally
- **Prescription Documents** — Auto-generated printable PDF documents prefilled from transcripts
- **Role-Based Access** — Separate Doctor and Patient workflows
- **OAuth Login** — Google, Microsoft, Yahoo via Supabase Auth
- **Medication Reminders** — Push notifications for patients
- **PWA** — Installable on iOS/Android, offline-capable

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| AI Server | Python (FastAPI) + Ollama (Llama 3.2) |
| Deployment | Netlify (frontend) + Local (AI backend) |

## Project Structure

```
medical-app/
├── backend/
│   ├── server.py              # FastAPI + Ollama AI server
│   └── requirements.txt
├── supabase/
│   └── schema.sql             # Database schema + RLS policies
├── src/
│   ├── contexts/AuthContext.jsx
│   ├── utils/
│   │   ├── ai.js              # Speech recognition + backend calls
│   │   ├── db.js              # Supabase database operations
│   │   └── documentGenerator.js # PDF document generation
│   ├── components/
│   │   ├── Layout.jsx
│   │   └── LoadingScreen.jsx
│   └── pages/
│       ├── doctor/            # Dashboard, Patients, Consultations
│       └── patient/           # Dashboard, Appointments, Prescriptions, Reminders
├── .env.example
├── package.json
├── vite.config.js
├── tailwind.config.js
└── netlify.toml
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- [Ollama](https://ollama.com/download) installed
- Supabase account

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/medconnect.git
cd medconnect
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Enable Google OAuth in Authentication → Providers
4. Create a `recordings` storage bucket (private)
5. Set **Site URL** to `http://localhost:5173` in Authentication → URL Configuration
6. Add `http://localhost:5173/**` to **Redirect URLs**

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AI_BACKEND_URL=http://localhost:8000
```

### 4. Start Ollama

```bash
ollama pull llama3.2
ollama serve
```

### 5. Start AI Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 server.py
```

Verify at: http://localhost:8000/health

### 6. Start Frontend

```bash
npm run dev
```

Open: http://localhost:5173

## How It Works

### Doctor Flow

1. Sign in with Google → Set up Doctor profile
2. Add patients with personal info, vitals, medical history
3. Start a consultation → Select patient → Choose SOAP Note or Prescription
4. Record the consultation — speech is transcribed live
5. Stop recording → AI (Llama 3.2) processes transcript into structured data
6. Review/edit the generated SOAP note or prescription
7. Generate a printable PDF document
8. Save to database

### Patient Flow

1. Sign in → Records auto-link via email
2. View upcoming appointments
3. View prescriptions and download PDF documents
4. Set medication reminders with push notifications

## Deployment

### Frontend (Netlify)

1. Push to GitHub
2. Connect repo to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Update Supabase redirect URLs with your Netlify domain

### AI Backend (Local / Railway / Render)

For demo purposes, run the backend locally. For production, deploy to Railway or Render with Ollama.

## Team

Built for Convergence 2026 Hackathon.

## License

MIT
