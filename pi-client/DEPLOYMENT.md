# Deployment Guide

Guide for deploying the Message Board client to run automatically on Raspberry Pi boot.

## Prerequisites

- Raspberry Pi Zero 2W fully set up (see PI_SETUP_GUIDE.md)
- Client tested and working manually
- Backend server running and accessible
- Config file properly configured

## Option 1: Systemd Service (Recommended)

This makes the client start automatically on boot and restart if it crashes.

### Install the Service

```bash
# Make sure you're in the pi-client directory
cd ~/messageboard/pi-client

# Copy the service file to systemd directory
sudo cp messageboard.service /etc/systemd/system/

# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable messageboard

# Start the service now
sudo systemctl start messageboard
```

### Check Service Status

```bash
# View service status
sudo systemctl status messageboard

# Should show:
#   Active: active (running)
#   Main PID: <some number>
```

### View Logs

```bash
# View recent logs
sudo journalctl -u messageboard -n 50

# Follow logs in real-time
sudo journalctl -u messageboard -f

# View logs since boot
sudo journalctl -u messageboard -b
```

### Service Management Commands

```bash
# Stop the service
sudo systemctl stop messageboard

# Start the service
sudo systemctl start messageboard

# Restart the service
sudo systemctl restart messageboard

# Disable auto-start on boot
sudo systemctl disable messageboard

# Check if service is enabled
sudo systemctl is-enabled messageboard
```

### Update the Client

When you need to update the code:

```bash
# Stop the service
sudo systemctl stop messageboard

# Update your code (git pull, or copy new files)
cd ~/messageboard/pi-client
# ... make your changes ...

# Restart the service
sudo systemctl start messageboard

# Check logs to verify it's working
sudo journalctl -u messageboard -f
```

## Option 2: Cron Job (Alternative)

If you prefer not to use systemd:

```bash
# Edit crontab
crontab -e

# Add this line at the bottom:
@reboot sleep 30 && cd /home/pi/messageboard/pi-client && /home/pi/.cargo/bin/uv run python main.py >> /home/pi/messageboard.log 2>&1

# Save and exit (Ctrl+X, Y, Enter)
```

**Note:** The systemd approach is preferred as it provides better logging, automatic restarts, and easier management.

## Production Backend Setup

**Recommended Hosting:**
- **Backend:** Railway Hobby ($5/month) - Always-on, no auto-sleep
- **Frontend:** Vercel Hobby (Free) - Global CDN

### Using Railway (Recommended)

If deploying backend to Railway:

1. **Deploy backend to Railway** (see [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md))
2. **Get your Railway URL** from dashboard (e.g., `https://messageboard-backend-production.up.railway.app`)
3. **Update Pi config with Railway URL:**
   ```bash
   nano ~/messageboard/pi-client/config.py
   # Change API_URL to:
   API_URL = "https://your-app.up.railway.app/api/messages"
   API_KEY = "your-pi-api-key-here"
   ```

4. **CORS is automatically configured** via Railway environment variable `CORS_ORIGINS`

### Using a Home Server (Alternative)

If running the backend on a local server:

1. **Find your server's local IP:**
   ```bash
   # On the server
   ip addr show | grep "inet "
   # Note the IP like 192.168.1.100
   ```

2. **Update Pi config:**
   ```bash
   nano ~/messageboard/pi-client/config.py
   # Change API_URL to:
   API_URL = "http://192.168.1.100:8000/api/messages"
   ```

3. **Make sure backend runs on boot:**
   ```bash
   # On the server, create systemd service for backend too
   # (Similar to pi-client but for backend)
   ```

## Network Configuration

### Static IP (Recommended)

Give your Pis static IPs so they're easier to find:

1. **Find your Pi's MAC address:**
   ```bash
   ip link show wlan0 | grep link/ether
   ```

2. **Configure static IP in your router:**
   - Access your router's admin panel
   - Look for DHCP settings or "Static IP" section
   - Assign fixed IP to Pi's MAC address
   - Example: alice = 192.168.1.101, bob = 192.168.1.102

3. **Or configure on the Pi:**
   ```bash
   sudo nano /etc/dhcpcd.conf

   # Add at the bottom:
   interface wlan0
   static ip_address=192.168.1.101/24
   static routers=192.168.1.1
   static domain_name_servers=192.168.1.1 8.8.8.8

   # Save and reboot
   sudo reboot
   ```

### Firewall

If you have a firewall, allow traffic:

```bash
# On the Pi (if ufw is installed)
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# On the backend server
sudo ufw allow 8000/tcp  # API
sudo ufw allow 80/tcp    # HTTP (if using Nginx)
sudo ufw allow 443/tcp   # HTTPS (if using SSL)
```

## Monitoring and Maintenance

### Check Disk Space

```bash
# View disk usage
df -h

# Clean up old logs if needed
sudo journalctl --vacuum-time=7d  # Keep only 7 days of logs
```

### Monitor System Resources

```bash
# Install htop for monitoring
sudo apt install htop

# Run htop
htop

# Look for:
# - CPU usage (should be low, < 10%)
# - Memory usage (should be < 200MB)
# - No memory leaks
```

### Update System

Regular maintenance:

```bash
# Update system packages (monthly)
sudo apt update && sudo apt upgrade -y

# Reboot after updates
sudo reboot
```

## Backup Configuration

Save your config files before making changes:

```bash
# Backup config
cp ~/messageboard/pi-client/config.py ~/config.backup

# Restore if needed
cp ~/config.backup ~/messageboard/pi-client/config.py
```

## Troubleshooting Deployment Issues

### Service Won't Start

```bash
# Check for errors in service file
sudo systemctl status messageboard

# Check logs
sudo journalctl -u messageboard -n 100 --no-pager

# Common issues:
# - Wrong path in ExecStart
# - Missing uv installation
# - Config file errors
# - Permission issues
```

### Service Starts But Doesn't Work

```bash
# Check if it's actually running
ps aux | grep python

# Check network connectivity
ping -c 3 <backend-server-ip>

# Test API manually
curl http://<backend-server>:8000/api/messages/alice

# Check SPI is enabled
lsmod | grep spi
```

### Display Not Updating

```bash
# Check service logs
sudo journalctl -u messageboard -f

# Look for:
# - Network errors (check WiFi)
# - API errors (check backend)
# - Display errors (check SPI/HAT connection)
```

### High CPU Usage

```bash
# Check poll interval isn't too short
nano ~/messageboard/pi-client/config.py
# POLL_INTERVAL should be >= 60

# Check for infinite loops
sudo journalctl -u messageboard -f
```

## Production Checklist

Before considering the deployment complete:

- [ ] Backend deployed and accessible
- [ ] Both Pis have static IPs
- [ ] Systemd service installed on both Pis
- [ ] Service enabled to start on boot
- [ ] Service logs are clean
- [ ] Messages flow in both directions
- [ ] Display updates work reliably
- [ ] System runs stable for 24+ hours
- [ ] Monitoring/logging in place
- [ ] Backup plan for config files
- [ ] Documentation updated with final URLs/IPs

## Handing Off to Users

When giving the boxes to users:

1. **Pre-configure everything** - They should just plug it in
2. **Provide simple instructions:**
   - Plug in power cable
   - Wait 2 minutes for boot
   - Messages will appear automatically
3. **Give them the web app URL** to send messages
4. **Provide support contact** for issues
5. **Include a "getting started" card**

## Next Steps

- Consider SSL/HTTPS for backend
- Set up monitoring/alerting for service downtime
- Create backup Pi images for easy recovery
- Design and build enclosures
- Add status LED for "message received" indicator
