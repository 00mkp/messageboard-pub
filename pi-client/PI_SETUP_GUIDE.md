# Raspberry Pi Zero 2W Setup Guide

Complete guide for setting up your Message Board display on Raspberry Pi Zero 2W.

## Hardware Checklist

- [ ] Raspberry Pi Zero 2W H (with pre-soldered GPIO headers)
- [ ] 3.7" Waveshare E-Ink Display HAT (480x280, 4-gray)
- [ ] MicroSD card (32GB+ recommended, Class 10 or better)
- [ ] USB-C power supply (5V, 2.5A minimum)
- [ ] MicroSD card reader (for flashing from your computer)
- [ ] (Optional) Mini HDMI to HDMI adapter for direct display access
- [ ] (Optional) USB OTG adapter for keyboard/mouse

## Step 1: Flash Raspberry Pi OS

### Download Raspberry Pi Imager

1. Go to https://www.raspberrypi.com/software/
2. Download and install **Raspberry Pi Imager** for your OS (Windows/Mac/Linux)

### Flash the SD Card

1. Insert your microSD card into your card reader
2. Open Raspberry Pi Imager
3. Click **"Choose Device"** → Select **"Raspberry Pi Zero 2 W"**
4. Click **"Choose OS"** → Select **"Raspberry Pi OS Lite (64-bit)"**
   - Use the **Lite** version (no desktop GUI needed)
5. Click **"Choose Storage"** → Select your microSD card

### Configure OS Settings (IMPORTANT!)

6. Click the **⚙️ Settings icon** (bottom right) or press Ctrl+Shift+X
7. Configure the following:

**General Tab:**
- ✅ **Set hostname:** `messageboard-alice` (or `messageboard-bob`)
- ✅ **Set username and password:**
  - Username: `pi`
  - Password: `your-secure-password`
- ✅ **Configure wireless LAN:**
  - SSID: `your-wifi-name`
  - Password: `your-wifi-password`
  - Wireless LAN country: `US` (or your country)
- ✅ **Set locale settings:**
  - Time zone: `America/New_York` (or your timezone)
  - Keyboard layout: `us`

**Services Tab:**
- ✅ **Enable SSH:**
  - Use password authentication (or set up SSH keys if you prefer)

8. Click **"Save"**
9. Click **"Yes"** to apply OS customization settings
10. Click **"Yes"** to confirm erasing the SD card
11. Wait for the write and verify process to complete (~5-10 minutes)
12. Click **"Continue"** and eject the SD card

## Step 2: First Boot

1. Insert the flashed microSD card into your Raspberry Pi Zero 2W
2. **DO NOT attach the e-ink display yet** (we'll do that after software setup)
3. Connect the USB-C power supply
4. Wait ~60 seconds for first boot and WiFi connection

## Step 3: Connect via SSH

### Find Your Pi's IP Address

**Option 1: Check your router's connected devices**
- Look for device named `messageboard-alice` or similar

**Option 2: Use network scanner**
- Mac/Linux: `sudo arp-scan --localnet | grep -i raspberry`
- Windows: Use "Advanced IP Scanner" or similar tool

**Option 3: Try the hostname**
- `messageboard-alice.local` (may not work on all networks)

### SSH Into the Pi

From your computer's terminal:

```bash
ssh pi@<IP-ADDRESS>
# Or try:
ssh pi@messageboard-alice.local
```

Enter the password you set during imaging.

## Step 4: Update the System

Once connected via SSH:

```bash
# Update package lists
sudo apt update

# Upgrade all packages (this may take 10-15 minutes)
sudo apt upgrade -y

# Install essential tools
sudo apt install -y git python3-pip python3-venv
```

## Step 5: Install Python Dependencies

```bash
# Install system dependencies for Pillow (image library)
sudo apt install -y \
    python3-pil \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7 \
    libtiff5 \
    fonts-dejavu-core

# Install uv (modern Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Reload shell to get uv in PATH
source $HOME/.cargo/env
```

## Step 6: Install Waveshare E-Ink Library

```bash
# Navigate to home directory
cd ~

# Clone Waveshare's e-Paper library
git clone https://github.com/waveshare/e-Paper.git

# Install Python dependencies for the display
cd e-Paper/RaspberryPi_JetsonNano/python
sudo python3 setup.py install
```

## Step 7: Enable SPI Interface

The e-ink display communicates via SPI, which needs to be enabled:

```bash
# Open raspi-config
sudo raspi-config
```

Navigate using arrow keys:
1. Select **"3 Interface Options"**
2. Select **"I4 SPI"**
3. Select **"Yes"** to enable SPI
4. Select **"Finish"**
5. **Reboot when prompted:** `sudo reboot`

Wait ~30 seconds and reconnect via SSH.

## Step 8: Set Up the Message Board Client

### Clone Your Project

```bash
# Navigate to home directory
cd ~

# Clone your project (replace with your actual repo URL when deployed)
# For now, we'll create the directory manually
mkdir -p messageboard/pi-client
cd messageboard/pi-client
```

### Transfer Files to Pi

From your **development computer** (not the Pi), run:

```bash
# Navigate to your project
cd /path/to/messageboard/pi-client

# Copy files to Pi (replace <IP-ADDRESS> with your Pi's IP)
scp -r * pi@<IP-ADDRESS>:~/messageboard/pi-client/
```

### Install Project Dependencies

Back on the **Pi via SSH**:

```bash
cd ~/messageboard/pi-client

# Install dependencies using uv
uv sync
```

### Configure the Client

```bash
# Copy the example config
cp config.py.example config.py

# Edit the config
nano config.py
```

Update these settings:
- `MY_USERNAME`: Set to `"alice"` or `"bob"`
- `API_URL`: Set to your backend URL (e.g., `"http://192.168.1.100:8000/api/messages"`)
- `USE_MOCK_DISPLAY`: Keep as `True` for testing, change to `False` for real hardware
- `POLL_INTERVAL`: Keep at `60` for production (safe with partial refresh)
- `USE_PARTIAL_REFRESH`: Keep as `True` (fast updates, protects display)
- `FULL_REFRESH_INTERVAL_HOURS`: Keep at `12` (clears ghosting twice daily)

Press `Ctrl+X`, then `Y`, then `Enter` to save and exit.

## Step 9: Test Without Display

Before connecting the hardware, test that the software works:

```bash
cd ~/messageboard/pi-client
uv run python main.py
```

You should see:
- "🚀 Starting Message Board Display for alice" (or bob)
- Mock display output if there are messages
- No errors about missing libraries

Press `Ctrl+C` to stop.

## Step 10: Attach the E-Ink Display

1. **Power off the Pi:** `sudo shutdown now`
2. Wait 10 seconds
3. **Disconnect power**
4. Carefully align the e-ink HAT's 40-pin connector with the Pi's GPIO header
5. Gently press down until fully seated
6. Reconnect power

## Step 11: Test with Real Display

SSH back into the Pi, then:

```bash
cd ~/messageboard/pi-client

# Edit config to use real display
nano config.py
# Change: USE_MOCK_DISPLAY = False

# Run the client
uv run python main.py
```

You should see the e-ink display initialize and show messages!

## Step 12: Set Up Auto-Start (Optional)

See `DEPLOYMENT.md` for instructions on setting up the client to auto-start on boot using systemd.

## Troubleshooting

### Display not working
- Check that SPI is enabled: `lsmod | grep spi`
- Verify HAT is properly seated on GPIO pins
- Check Waveshare library installation

### Can't connect via SSH
- Verify WiFi credentials in Raspberry Pi Imager settings
- Check router for connected device
- Try connecting via HDMI and keyboard to debug

### Import errors
- Make sure you ran `sudo python3 setup.py install` in the Waveshare library directory
- Verify all system dependencies are installed

### Display shows garbage/corruption
- Power cycle the Pi
- Check power supply is adequate (2.5A minimum)
- Verify you're using the correct Waveshare library for your display model

## Next Steps

- Set up the second Pi for the other user
- Configure systemd service for auto-start
- Design and build enclosure
- Deploy backend to production server
