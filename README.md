# Long Distance Message Board

A physical message board system for two people. Send a message through the web app, and it appears on the recipient's e-ink display within 60 seconds. Each person gets their own Raspberry Pi with an e-ink screen that shows the latest message sent to them.

## Architecture

```
                          +------------------+
                          |   Frontend       |
                          |   React + Vite   |
                          |   (Vercel)       |
                          +--------+---------+
                                   |
                                   | HTTPS
                                   |
                          +--------+---------+
                          |   Backend        |
                          |   FastAPI + SQLite|
                          |   (Railway)      |
                          +--------+---------+
                                   |
                          +--------+---------+
                          |                  |
                   +------+------+   +-------+-----+
                   | Pi Client A |   | Pi Client B |
                   | (e-ink)     |   | (e-ink)     |
                   +-------------+   +-------------+
```

- **Backend** — FastAPI REST API with SQLite. Handles authentication, message storage, image uploads, and a Connect 4 game. Deployed on Railway.
- **Frontend** — React SPA with Tailwind CSS. Login, send messages (text + images), view history, admin panel. Deployed on Vercel.
- **Pi Client** — Python script running on a Raspberry Pi Zero 2 W. Polls the backend every 60 seconds and renders messages on a Waveshare e-ink display.

## Features

- Text messages (up to 300 characters, optimized for e-ink)
- Image attachments (JPG, PNG, HEIC with auto-conversion)
- Message history with delivery status tracking
- Connect 4 game between the two users
- Admin panel with storage monitoring and Pi heartbeat status
- Token-based auth with single-session enforcement
- Rate limiting on all endpoints
- Pi client with exponential backoff and graceful error recovery
- HEIC to JPG auto-conversion for iOS photos

## Prerequisites

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

**For hardware setup:**
- Raspberry Pi Zero 2 W (one per user)
- Waveshare 3.7" e-ink display (480x280, 4-level grayscale)

## Quick Start (Local Development)

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd messageboard
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — generate keys with: python -c "import secrets; print(secrets.token_urlsafe(32))"
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0
# Runs on http://localhost:8000
```

On first start, two default users (`alice` and `bob`) are created with the password `changeme`. Log in and change these immediately.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# Runs on http://localhost:5173
```

### 4. Pi Client (mock mode)

```bash
cd pi-client
cp config.py.example config_alice.py
# Edit config_alice.py — set API_KEY to match PI_API_KEY from backend/.env
uv sync
uv run python run_alice.py
```

This runs with a mock display by default. Set `USE_MOCK_DISPLAY = False` when running on actual Pi hardware.

## Configuration

All secrets are managed through environment variables. See each `.env.example` for details:

| File | Key Variables |
|------|--------------|
| `backend/.env` | `MASTER_KEY`, `PI_API_KEY`, `CORS_ORIGINS` |
| `frontend/.env` | `VITE_API_URL` |
| `pi-client/config_<user>.py` | `API_KEY`, `API_URL`, `MY_USERNAME` |

Generate secure keys with:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Customization

The system is set up for two users (`alice` and `bob`). To use your own usernames:

1. **Backend** — Edit `VALID_USERS` and `DISPLAY_NAMES` in `backend/models.py`
2. **Frontend** — Edit `displayNames` in `frontend/src/config/api.js` and update username references in components (`MessageForm.jsx`, `ConnectFour.jsx`, `CurrentlyDisplayed.jsx`, `AdminPanel.jsx`)
3. **Pi Client** — Create config files named `config_<username>.py` and matching `run_<username>.py` entry points

## Deployment

**Recommended setup:** Railway (backend, ~$5/month) + Vercel (frontend, free)

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for a full step-by-step guide covering:
- Backend deployment to Railway
- Frontend deployment to Vercel
- Connecting backend and frontend (CORS)
- Pi client configuration for production
- Troubleshooting

### Pi Hardware Setup

See [pi-client/PI_SETUP_GUIDE.md](pi-client/PI_SETUP_GUIDE.md) for:
- Raspberry Pi OS setup
- E-ink display wiring
- Service installation (auto-start on boot)
- Network configuration

## Project Structure

```
messageboard/
├── backend/
│   ├── main.py              # FastAPI app — routes, middleware, startup
│   ├── auth.py              # Token generation and verification
│   ├── database.py          # SQLite operations
│   ├── models.py            # Pydantic models, validation, user config
│   ├── deps.py              # Auth dependencies, session tracking
│   ├── connect4.py          # Connect 4 game endpoints
│   ├── scripts/
│   │   └── create_users.py  # Manual user creation script
│   ├── .env.example         # Environment variable template
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Login.jsx
│   │   │   ├── MessageForm.jsx
│   │   │   ├── MessageHistory.jsx
│   │   │   ├── CurrentlyDisplayed.jsx
│   │   │   ├── ConnectFour.jsx
│   │   │   ├── ChangePassword.jsx
│   │   │   ├── AdminPanel.jsx
│   │   │   └── Toast.jsx
│   │   ├── config/api.js    # API URL + display name config
│   │   └── utils/           # authFetch, password validation
│   ├── .env.example
│   └── package.json
├── pi-client/
│   ├── display.py           # Main polling loop
│   ├── render.py            # Message → image rendering
│   ├── waveshare_display.py # E-ink hardware driver
│   ├── mock_display.py      # Mock display for testing
│   ├── config.py.example    # Config template
│   ├── PI_SETUP_GUIDE.md    # Hardware setup guide
│   └── pyproject.toml
├── DEPLOYMENT_CHECKLIST.md  # Full deployment walkthrough
├── PRODUCTION_HARDENING.md  # Security features documentation
└── PI_HEARTBEAT_MONITORING.md # Pi status monitoring guide
```

## Other Documentation

- [PRODUCTION_HARDENING.md](PRODUCTION_HARDENING.md) — Security and reliability features (rate limiting, input validation, error recovery, etc.)
- [PI_HEARTBEAT_MONITORING.md](PI_HEARTBEAT_MONITORING.md) — How to monitor Pi device status via the admin API
- [pi-client/DEPLOYMENT.md](pi-client/DEPLOYMENT.md) — Pi client deployment details
- [pi-client/TESTING_CHECKLIST.md](pi-client/TESTING_CHECKLIST.md) — Testing checklist for Pi client

## License

MIT
