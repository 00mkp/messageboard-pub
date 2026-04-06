# Hardware Testing Checklist

Use this checklist when your Pi hardware arrives to ensure everything works correctly.

## Pre-Hardware Tests (Do These First)

### Backend Server
- [ ] Backend server is running and accessible
- [ ] Can access http://localhost:8000 in browser
- [ ] API health check works: http://localhost:8000/health
- [ ] Can login to web app with test credentials
- [ ] Can send messages between users
- [ ] Can upload images with messages
- [ ] Messages show "Delivered" status in web app

### Pi Client Mock Display
- [ ] Mock display client runs without errors: `uv run python main.py`
- [ ] Can run both alice and bob clients simultaneously
- [ ] Mock display shows messages sent via web app
- [ ] Mock display downloads and shows image info
- [ ] Messages marked as "Delivered" when displayed

## Hardware Assembly Tests

### Physical Assembly
- [ ] Pi Zero 2W sits properly in case
- [ ] E-ink HAT aligns correctly with GPIO header
- [ ] HAT presses down smoothly without resistance
- [ ] No bent GPIO pins
- [ ] Power cable connects securely
- [ ] SD card slides in and clicks into place

### Initial Power-On
- [ ] Green LED on Pi lights up when powered
- [ ] Pi boots successfully (wait 60 seconds)
- [ ] Can connect via SSH: `ssh pi@<IP-ADDRESS>`
- [ ] WiFi connection is stable

## Software Installation Tests

### System Updates
- [ ] `sudo apt update` runs without errors
- [ ] `sudo apt upgrade -y` completes successfully
- [ ] System dependencies install correctly

### SPI Interface
- [ ] SPI enabled in raspi-config
- [ ] SPI module loaded: `lsmod | grep spi` shows output
- [ ] `/dev/spidev0.0` device exists

### Waveshare Library
- [ ] Waveshare e-Paper library cloned successfully
- [ ] Python setup completes without errors
- [ ] Can import library: `python3 -c "from waveshare_epd import epd3in7"`

### Project Setup
- [ ] Files transferred to Pi via SCP
- [ ] `uv sync` installs dependencies
- [ ] config.py created and edited
- [ ] API_URL points to correct backend server

## Display Hardware Tests

### Display Detection
- [ ] HAT seated properly on GPIO header
- [ ] No physical damage to display
- [ ] Ribbon cable connected securely

### First Display Test (Mock Mode)
- [ ] Set `USE_MOCK_DISPLAY = True`
- [ ] Run `uv run python main.py`
- [ ] No import errors
- [ ] Mock display shows messages

### First Display Test (Real Hardware)
- [ ] Set `USE_MOCK_DISPLAY = False`
- [ ] Run `uv run python main.py`
- [ ] Display initializes without errors
- [ ] Screen clears to white/gray
- [ ] Display shows initialization messages

## Message Display Tests

### Text-Only Messages
- [ ] Send short message (< 50 chars) from web app
- [ ] Message appears on e-ink within 60 seconds
- [ ] Sender name displays correctly
- [ ] Message text is readable
- [ ] Timestamp shows correctly
- [ ] Web app shows "Delivered" status

### Long Messages
- [ ] Send long message (200+ chars)
- [ ] Text wraps properly
- [ ] No text cutoff or overflow
- [ ] Ellipsis appears if truncated

### Messages with Images
- [ ] Send message with small image (< 500KB)
- [ ] Image downloads to Pi
- [ ] Image displays on e-ink
- [ ] Image is recognizable
- [ ] Image doesn't distort text
- [ ] 4-level grayscale shows properly

### Multiple Messages
- [ ] Send second message to same user
- [ ] Display updates to show new message
- [ ] Old message is replaced
- [ ] "Delivered" status updates for new message

## Polling and Updates Tests

### Poll Interval
- [ ] Client polls every 60 seconds (check timestamps in output)
- [ ] No excessive CPU usage (< 10%)
- [ ] No memory leaks (stable memory over 10+ polls)

### Network Resilience
- [ ] Client continues running if backend is temporarily down
- [ ] Client recovers when backend comes back online
- [ ] No crashes on network errors
- [ ] Error messages are clear and helpful

### Display Refresh
- [ ] Same message re-displays correctly after each poll
- [ ] No ghosting or artifacts on screen
- [ ] Display remains readable after multiple refreshes

## Power and Reliability Tests

### Power Supply
- [ ] Pi runs stable with display attached
- [ ] No power warnings in system logs
- [ ] No voltage throttling messages
- [ ] Display updates don't cause brownouts

### Long-Running Stability
- [ ] Client runs for 1 hour without crashes
- [ ] Client runs overnight without issues
- [ ] No memory leaks over extended operation
- [ ] System logs are clean (check with `journalctl -u messageboard`)

### Graceful Shutdown
- [ ] Ctrl+C stops client cleanly
- [ ] Display sleeps properly on exit
- [ ] `sudo shutdown now` completes successfully
- [ ] Pi can be safely powered off

## Both Pis Together

### Dual Operation
- [ ] Both Pis running simultaneously
- [ ] UserA can see messages from UserB
- [ ] UserB can see messages from UserA
- [ ] Both displays update correctly
- [ ] No conflicts or errors

### Bidirectional Communication
- [ ] alice sends message → shows on bob's display
- [ ] bob sends message → shows on alice's display
- [ ] Both messages marked "Delivered"
- [ ] Images work in both directions

## Edge Cases and Error Handling

### Empty States
- [ ] Display shows message when no messages exist
- [ ] Clear_display works correctly
- [ ] First message after empty state displays correctly

### Image Errors
- [ ] Handles missing image files gracefully
- [ ] Shows placeholder if image download fails
- [ ] Continues operation if image is corrupted

### API Errors
- [ ] Handles 404 (no messages) correctly
- [ ] Handles 500 (server error) without crashing
- [ ] Handles network timeout gracefully
- [ ] Continues polling after errors

## Auto-Start Tests (After systemd setup)

### Service Installation
- [ ] Systemd service file created
- [ ] Service enabled: `sudo systemctl enable messageboard`
- [ ] Service starts: `sudo systemctl start messageboard`
- [ ] Service status is active: `sudo systemctl status messageboard`

### Boot Behavior
- [ ] Pi boots and starts client automatically
- [ ] Display initializes without manual intervention
- [ ] Messages appear within 2 minutes of boot
- [ ] Can check logs: `journalctl -u messageboard -f`

### Service Management
- [ ] Can stop service: `sudo systemctl stop messageboard`
- [ ] Can restart service: `sudo systemctl restart messageboard`
- [ ] Can view logs: `journalctl -u messageboard`
- [ ] Service restarts automatically if crashed

## Final Acceptance Tests

### User Experience
- [ ] Messages are readable from 2-3 feet away
- [ ] Images are recognizable
- [ ] Update time (60s) feels reasonable
- [ ] Display quality meets expectations
- [ ] Overall experience feels polished

### Performance
- [ ] Pi runs cool (< 60°C)
- [ ] Battery/power consumption acceptable
- [ ] No noticeable lag or delays
- [ ] WiFi connection is stable

### Documentation
- [ ] All setup steps are documented
- [ ] Troubleshooting guide is helpful
- [ ] Configuration is clear and commented
- [ ] Ready to hand off to end user

## Troubleshooting Reference

### Common Issues

**Display shows garbage:**
- Power cycle the Pi
- Check HAT seating
- Verify correct display driver

**Display doesn't update:**
- Check SPI is enabled
- Verify GPIO connections
- Check system logs for errors

**Import errors:**
- Reinstall Waveshare library
- Check Python path
- Verify dependencies installed

**Network issues:**
- Check WiFi credentials
- Ping backend server
- Verify firewall settings

**High CPU usage:**
- Check poll interval isn't too short
- Look for infinite loops in logs
- Monitor with `htop`

## Sign Off

Once all tests pass:

- [ ] Hardware setup complete
- [ ] Software tested and working
- [ ] Both Pis operational
- [ ] Ready for enclosure installation
- [ ] Ready for production deployment

**Tested by:** _______________
**Date:** _______________
**Notes:** _______________
