# EscrowPilot 360
### AI-Powered Payment Trust, Milestone Management & Dispute Resolution

EscrowPilot 360 is an AI-powered payment trust platform designed to improve transparency and trust between freelancers and clients. It combines milestone management, AI-powered evidence evaluation, dispute investigation, and PayPal Sandbox payment integration.

## Key Features

- **AI Evidence Lab:** Evaluates submitted milestone evidence against acceptance criteria using Groq AI.
- **Evidence History:** Stores previous evidence analyses and supports PDF report export.
- **ClaimLoop:** Investigates disputes using AI, identifies conflicting statements, highlights missing evidence, and supports human decisions.
- **PayPal Sandbox Integration:** Creates checkout orders, verifies payment orders, captures approved payments, and stores transaction history.
- **Milestone Management:** Supports milestone-based project workflows.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | SQLite |
| AI | Groq API, Llama 3.3 70B |
| Payments | PayPal REST API – Sandbox |

## Architecture

React Frontend → FastAPI Backend → AI Services / PayPal API → SQLite Database

## Run Locally

### Backend

```bash
cd backend
python -m venv venv
```

Activate the environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env` with your own credentials:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret
PAYPAL_MODE=sandbox
```

Start the backend:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API documentation: http://127.0.0.1:8000/docs

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## Demo and Safety

- PayPal integration is configured for Sandbox testing, not live payments.
- AI findings are advisory and require human review.
- AI does not independently decide or execute dispute-related payment releases.
- Do not commit API keys, credentials, or local database files.

## Project Status

Core frontend, backend, AI evidence analysis, ClaimLoop dispute investigation, and PayPal Sandbox checkout and transaction history have been implemented and tested locally.

## License

MIT License
