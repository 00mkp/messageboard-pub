# Pi Heartbeat Monitoring

The backend now tracks when each Pi last checked in, so you can see if they're online **without SSH**.

## 🔍 How It Works

1. **Every time a Pi polls for messages** (every 60 seconds), the backend records the timestamp
2. **You can check the status** via a simple API endpoint
3. **Visible in Railway logs** when you check the status

---

## 🌐 How to Check Pi Status

### From Your Browser (Easiest)

Just visit this URL (replace with your actual backend URL and MASTER_KEY):

```
https://your-backend.railway.app/admin/pi-status?master_key=YOUR_MASTER_KEY
```

**Example with your current key:**
```
http://localhost:8000/admin/pi-status?master_key=your-master-key-here
```

### From Command Line (curl)

```bash
curl "https://your-backend.railway.app/admin/pi-status?master_key=YOUR_MASTER_KEY"
```

---

## 📊 What You'll See

### Example Response (Both Pis Online):

```json
{
  "timestamp": "2025-10-22T10:15:30.123456",
  "pis": {
    "alice": {
      "status": "online",
      "last_seen": "2025-10-22T10:15:15.123456",
      "last_seen_ago": "15 seconds ago",
      "online": true
    },
    "bob": {
      "status": "online",
      "last_seen": "2025-10-22T10:14:45.123456",
      "last_seen_ago": "45 seconds ago",
      "online": true
    }
  },
  "summary": {
    "total": 2,
    "online": 2,
    "offline": 0
  }
}
```

### Example Response (One Pi Offline):

```json
{
  "timestamp": "2025-10-22T10:15:30.123456",
  "pis": {
    "alice": {
      "status": "online",
      "last_seen": "2025-10-22T10:15:15.123456",
      "last_seen_ago": "15 seconds ago",
      "online": true
    },
    "bob": {
      "status": "offline",
      "last_seen": "2025-10-22T08:30:00.123456",
      "last_seen_ago": "2 hours ago",
      "online": false
    }
  },
  "summary": {
    "total": 2,
    "online": 1,
    "offline": 1
  }
}
```

### Example Response (Pi Never Checked In):

```json
{
  "pis": {
    "alice": {
      "status": "never_seen",
      "last_seen": null,
      "last_seen_ago": "Never checked in",
      "online": false
    }
  }
}
```

---

## 🎯 What "Online" Means

- **Online**: Pi checked in within the last **2 minutes** (2x the poll interval of 60s)
- **Offline**: Pi hasn't checked in for over 2 minutes
- **Never Seen**: Pi has never checked in since backend started

---

## 🔒 Security

- **Protected with MASTER_KEY**: Only you can check the status
- **Rate limited**: 30 requests per minute max
- **Logged**: Every status check is logged in Railway/Render

---

## 💡 When to Use This

### ✅ Good Use Cases:
- Quick check if both Pis are working
- See if partner's Pi is online before sending a message
- Verify Pi setup after deployment
- Monitor from your phone while away

### ❌ Don't Need to Use It For:
- Debugging Pi issues (SSH is better - shows actual logs)
- Real-time monitoring (it's updated every 60 seconds, not instant)
- Checking message delivery (backend logs show this)

---

## 📱 Bookmark This URL

Save this bookmark in your browser:

```
https://your-backend.railway.app/admin/pi-status?master_key=YOUR_MASTER_KEY
```

Then you can check Pi status with one click anytime!

---

## 🚨 Troubleshooting

### "Invalid master key"
- Check you're using the correct MASTER_KEY from your backend .env
- Make sure the URL is correct (no typos)

### "alice: never_seen"
- The Pi hasn't started polling yet
- Check if the Pi is running: `ssh pi@messageboard-alice.local`
- Check Pi logs: `journalctl -u messageboard -f`

### "alice: offline (5 hours ago)"
- Pi stopped running or lost network
- SSH into Pi and check: `sudo systemctl status messageboard`
- Check Pi logs: `journalctl -u messageboard -n 100`

### Backend restarted - shows "never_seen"
- **This is normal!** Heartbeats are stored in memory, not database
- When Railway/Render restarts your backend, heartbeats reset
- Pis will check in within 60 seconds and status will update

---

## 🎨 Pretty Version (Optional)

If you want a prettier view, you can use a JSON formatter browser extension or pipe through `jq`:

```bash
curl "https://your-backend.railway.app/admin/pi-status?master_key=YOUR_KEY" | jq
```

Or create a simple HTML page that fetches and displays it nicely (let me know if you want this!).

---

## 📝 What Gets Logged

When you check Pi status, you'll see in Railway/Render logs:

```
2025-10-22 10:15:30,123 - main - INFO - Pi status check requested
```

When a Pi checks in, you'll see (at DEBUG level):

```
2025-10-22 10:15:15,456 - main - DEBUG - Pi heartbeat recorded for alice
```

---

## ✅ Done!

Now you can check if both Pis are online from anywhere, without SSH! Just visit the URL in your browser or set up a cron job to alert you if a Pi goes offline.
