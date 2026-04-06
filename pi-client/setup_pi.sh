#!/bin/bash

# Message Board Pi Setup Script
# Automates installation of dependencies and configuration
# Run this on the Raspberry Pi after flashing OS

set -e  # Exit on error

echo "================================================"
echo "  Message Board Pi Client Setup"
echo "================================================"
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/cpuinfo ] || ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install system dependencies
echo "📦 Installing system dependencies..."
sudo apt install -y \
    git \
    python3-pip \
    python3-venv \
    python3-pil \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7 \
    libtiff5 \
    fonts-dejavu-core

# Install uv (Python package manager)
echo "📦 Installing uv..."
if ! command -v uv &> /dev/null; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
else
    echo "✅ uv already installed"
fi

# Install Waveshare library
echo "📦 Installing Waveshare E-Ink library..."
cd ~
if [ ! -d "e-Paper" ]; then
    git clone https://github.com/waveshare/e-Paper.git
    cd e-Paper/RaspberryPi_JetsonNano/python
    sudo python3 setup.py install
    cd ~
else
    echo "✅ Waveshare library already installed"
fi

# Enable SPI
echo "🔧 Enabling SPI interface..."
if ! lsmod | grep -q spi; then
    sudo raspi-config nonint do_spi 0
    echo "✅ SPI enabled (reboot required)"
else
    echo "✅ SPI already enabled"
fi

# Create project directory
echo "📁 Setting up project directory..."
mkdir -p ~/messageboard/pi-client
cd ~/messageboard/pi-client

echo ""
echo "================================================"
echo "✅ Base system setup complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Copy project files to ~/messageboard/pi-client"
echo "   From your computer run:"
echo "   scp -r /path/to/pi-client/* pi@<PI-IP>:~/messageboard/pi-client/"
echo ""
echo "2. Install project dependencies:"
echo "   cd ~/messageboard/pi-client"
echo "   uv sync"
echo ""
echo "3. Configure the client:"
echo "   cp config.py.example config.py"
echo "   nano config.py"
echo ""
echo "4. Test the client:"
echo "   uv run python main.py"
echo ""
echo "5. Install systemd service:"
echo "   sudo cp messageboard.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable messageboard"
echo "   sudo systemctl start messageboard"
echo ""
echo "⚠️  IMPORTANT: Reboot required for SPI to work"
echo "   sudo reboot"
echo ""
