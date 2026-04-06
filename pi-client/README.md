# Pi Client - Message Board Display

Display client for the Message Board system, supporting both mock terminal display (for development) and real Waveshare 3.7" E-Ink displays (for production).

## Features

- Polls backend API for new messages every 60 seconds
- Displays messages on 3.7" E-Ink display (480x280, 4-level grayscale)
- Downloads and displays images with messages
- Marks messages as delivered automatically
- Auto-starts on boot via systemd
- Supports mock display mode for testing without hardware
- Exponential backoff on network errors (60s to 5min)
- Automatic image cleanup (keeps last 50, deletes after 30 days)

## Quick Start (Development/Testing)

### Prerequisites
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- Backend server running

### Install & Run

1. Install dependencies:
   ```bash
   uv sync
   ```

2. Create your config from the template:
   ```bash
   cp config.py.example config_alice.py
   nano config_alice.py  # Set MY_USERNAME, API_URL, and API_KEY
   ```

3. Run with mock display:
   ```bash
   uv run python run_alice.py
   ```

### Running Both Users Simultaneously

Terminal 1:
```bash
uv run python run_alice.py
```

Terminal 2:
```bash
uv run python run_bob.py
```

Each `run_<user>.py` imports `config_<user>.py` and starts the display loop. Create a config and run file for each user.

## Hardware Setup (Production)

### What You Need

- **Raspberry Pi Zero 2W H** (with pre-soldered GPIO headers)
- **Waveshare 3.7" E-Ink Display HAT** (480x280, 4-gray)
- **MicroSD card** (32GB+, Class 10)
- **USB-C power supply** (5V, 2.5A)
- **WiFi network** for API access

### Setup Guides

- **[PI_SETUP_GUIDE.md](PI_SETUP_GUIDE.md)** — Complete hardware setup (flash OS, wiring, install dependencies, deploy client)
- **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** — Hardware testing checklist
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Production deployment (systemd service, auto-start, monitoring)

### Quick Setup (On Raspberry Pi)

```bash
# Run automated setup script
./setup_pi.sh

# Or follow PI_SETUP_GUIDE.md for manual setup
```

## Configuration

Create a config file for each user by copying the template:

```bash
cp config.py.example config_<username>.py
```

### Key Settings

```python
MY_USERNAME = "alice"                        # Which user this Pi is for
API_URL = "https://your-backend.app/api/messages"  # Backend API endpoint
API_KEY = "your-pi-api-key-here"             # Matches PI_API_KEY in backend .env
POLL_INTERVAL = 60                           # Seconds between checks
USE_MOCK_DISPLAY = True                      # False for real hardware
DISPLAY_TYPE = "waveshare_3in7"              # Display model
DISPLAY_WIDTH = 480                          # Display resolution
DISPLAY_HEIGHT = 280
DISPLAY_GRAYSCALE = 4                        # 4-level grayscale
```

## Architecture

### Display Modes

**Mock Display** (`USE_MOCK_DISPLAY = True`)
- Prints messages to terminal
- Downloads and shows image info
- No hardware required

**Real Display** (`USE_MOCK_DISPLAY = False`)
- Renders to actual E-Ink display
- 4-level grayscale support
- Image rendering with automatic resizing
- Requires Raspberry Pi + Waveshare HAT

### How It Works

1. **Entry Point** (`run_<user>.py`) — Loads user-specific config and starts the display loop
2. **Polling Loop** (`display.py`) — Fetches latest message every 60 seconds, marks as delivered, handles errors with exponential backoff
3. **Rendering** (`render.py`) — Creates 480x280 grayscale image with text wrapping, sender/timestamp, and optional image
4. **Display Drivers** — `mock_display.py` for terminal output, `waveshare_display.py` for real hardware

## Systemd Service

The included `messageboard.service` file auto-starts the client on boot:

```bash
# Copy to systemd
sudo cp messageboard.service /etc/systemd/system/

# Edit to set the correct run_<user>.py
sudo nano /etc/systemd/system/messageboard.service

# Enable and start
sudo systemctl enable messageboard
sudo systemctl start messageboard
```

## Project Structure

```
pi-client/
├── display.py             # Main polling and display logic
├── render.py              # Image rendering for E-Ink
├── mock_display.py        # Mock terminal display
├── waveshare_display.py   # Real E-Ink display driver
├── run_alice.py           # Entry point (example user A)
├── run_bob.py             # Entry point (example user B)
├── config.py.example      # Configuration template
├── messageboard.service   # Systemd service file
├── setup_pi.sh            # Automated Pi setup script
├── PI_SETUP_GUIDE.md      # Hardware setup guide
├── TESTING_CHECKLIST.md   # Testing procedures
├── DEPLOYMENT.md          # Deployment guide
├── pyproject.toml         # Python dependencies
└── temp/                  # Downloaded images cache
```

## API Endpoints Used

- `GET /api/messages/{username}` — Fetch latest message
- `POST /api/messages/{id}/delivered` — Mark as delivered
- `GET /api/images/{filename}` — Download message images

## Troubleshooting

### Mock Display Issues

- **"No messages yet"** — Check backend is running and API_URL is correct
- **Import errors** — Run `uv sync` to install dependencies
- **API errors** — Verify API_KEY matches PI_API_KEY in backend .env

### Hardware Display Issues

- **Display not initializing** — Check SPI is enabled, HAT is seated properly
- **Import errors** — Install Waveshare library (see PI_SETUP_GUIDE.md)
- **Blank/corrupted display** — Power cycle Pi, check power supply (2.5A minimum)
- **Display not updating** — Check WiFi connection, backend accessibility

### Logs

```bash
# If running as service
sudo journalctl -u messageboard -f        # Follow logs
sudo journalctl -u messageboard -n 100    # Last 100 lines
sudo systemctl status messageboard         # Service status
```

## Hardware Specifications

### Supported Display

- **Model:** Waveshare 3.7" E-Ink Display HAT
- **Resolution:** 480x280 pixels
- **Colors:** 4-level grayscale (white, light gray, dark gray, black)
- **Interface:** SPI
- **Refresh:** Partial refresh supported

### Raspberry Pi

- **Model:** Raspberry Pi Zero 2W (with WiFi)
- **GPIO:** 40-pin header required for HAT
- **OS:** Raspberry Pi OS Lite (64-bit)
- **Python:** 3.11+
