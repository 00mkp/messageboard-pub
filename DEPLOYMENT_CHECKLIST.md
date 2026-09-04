# 🚀 Step-by-Step Deployment Checklist

Complete guide to deploy your message board system to production.

**Hosting Plan:**
- **Backend:** Railway Hobby ($5/month) - Always-on, 4GB storage
- **Frontend:** Vercel Hobby (Free) - Global CDN, unlimited deployments
- **Total Cost:** $5/month

---

## Pre-Deployment Checklist

Before you deploy anything, complete these tasks:

- [ ] **Test everything locally** (backend, frontend, mock Pi clients all working)
- [ ] **Change default passwords** for both users (alice and bob) using the web app
- [ ] **Verify credentials are secure** (check private/CREDENTIALS.md is NOT in git)
- [ ] **Confirm .env files are in .gitignore** (they should not be committed)

---

## Part 1: Deploy Backend to Railway

### Step 1.1: Create Railway Account

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended for auto-deployments)
4. Verify your email if required

### Step 1.2: Install Railway CLI (Optional but Recommended)

**On Mac/Linux:**
```bash
# Using Homebrew
brew install railway

# Or using npm
npm i -g @railway/cli
```

**On Windows:**
```bash
npm i -g @railway/cli
```

**Login:**
```bash
railway login
```

### Step 1.3: Create New Project

**Option A: Using Railway CLI (Recommended)**
```bash
# Navigate to your backend directory
cd /path/to/messageboard/backend

# Initialize Railway project
railway init

# Name your project (e.g., "messageboard-backend")
```

**Option B: Using Railway Dashboard**
1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select your repository
6. Set root directory to `/backend`

### Step 1.4: Set Environment Variables

**Using Railway CLI:**
```bash
railway variables set MASTER_KEY=your-master-key-here
railway variables set PI_API_KEY=your-pi-api-key-here
railway variables set CORS_ORIGINS=http://localhost:5173
```

**Using Railway Dashboard:**
1. Go to your project
2. Click "Variables" tab
3. Click "New Variable"
4. Add each variable:
   - `MASTER_KEY` = `your-master-key-here`
   - `PI_API_KEY` = `your-pi-api-key-here`
   - `CORS_ORIGINS` = `http://localhost:5173` (we'll update this later)

### Step 1.5: Configure Build Settings

Railway should auto-detect Python, but verify:

1. Go to project settings
2. Check "Build" settings:
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Install Command:** `pip install uv && uv sync`

### Step 1.6: Deploy Backend

**Using Railway CLI:**
```bash
railway up
```

**Using GitHub Auto-Deploy:**
- Push your code to GitHub
- Railway will automatically deploy

### Step 1.7: Get Your Backend URL

1. Go to Railway dashboard
2. Click on your service
3. Go to "Settings" → "Domains"
4. Click "Generate Domain"
5. Copy the URL (e.g., `https://your-railway-app.up.railway.app`)

### Step 1.8: Test Backend Health

```bash
# Replace with your actual Railway URL
curl https://your-app.up.railway.app/health

# Should return:
# {"status":"healthy","database":"connected"}
```

✅ **Backend Deployment Complete!**

---

## Part 2: Deploy Frontend to Vercel

### Step 2.1: Create Vercel Account

1. Go to https://vercel.com
2. Click "Sign Up"
3. Sign up with GitHub (recommended)

### Step 2.2: Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

### Step 2.3: Prepare Frontend

Update your frontend environment variable:

```bash
cd /path/to/messageboard/frontend

# Create production .env (don't commit this!)
echo "VITE_API_URL=https://your-railway-app.up.railway.app/api" > .env.production
```

**Replace `your-railway-app.up.railway.app` with your actual Railway URL from Step 1.7**

### Step 2.4: Deploy Frontend

**Option A: Using Vercel Dashboard (Easiest)**

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variables:
   - Click "Environment Variables"
   - Add: `VITE_API_URL` = `https://your-railway-app.up.railway.app/api`
6. Click "Deploy"

**Option B: Using Vercel CLI**

```bash
cd frontend
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? messageboard-frontend
# - Which directory? ./
# - Modify settings? Yes
# - Build command? npm run build
# - Output directory? dist

# Set environment variable
vercel env add VITE_API_URL
# Enter: https://your-railway-app.up.railway.app/api
# Select: Production

# Deploy to production
vercel --prod
```

### Step 2.5: Get Your Frontend URL

Vercel will provide a URL like:
- `https://your-frontend.vercel.app`

Copy this URL - you'll need it in the next step.

✅ **Frontend Deployment Complete!**

---

## Part 3: Connect Backend and Frontend

### Step 3.1: Update Backend CORS

**Using Railway CLI:**
```bash
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
```

**Using Railway Dashboard:**
1. Go to Railway project
2. Click "Variables"
3. Edit `CORS_ORIGINS`
4. Change from `http://localhost:5173` to `https://your-frontend.vercel.app`
5. Click "Save"

Railway will automatically redeploy.

### Step 3.2: Test the Connection

1. Open your Vercel frontend URL
2. Try logging in with:
   - Username: `alice`
   - Password: (your changed password)
3. Send a test message
4. Check that it appears in message history

### Step 3.3: Test Admin Panel

1. On the login page, click "Admin Panel"
2. Enter master key: `your-master-key-here`
3. Verify you can see:
   - Storage status (should show ~0 GB used)
   - Pi status (will show "never seen" until Pi devices connect)

✅ **Backend and Frontend Connected!**

---

## Part 4: Production Testing

Test all features on production:

- [ ] **Login works** for both users (alice and bob)
- [ ] **Send text-only message** appears in history
- [ ] **Send message with image** uploads and displays correctly
- [ ] **Message validation** works (try >300 chars, should fail)
- [ ] **Image validation** works (try >10MB, should fail)
- [ ] **Change password** works
- [ ] **Logout** works
- [ ] **Admin panel** loads and shows storage/Pi status
- [ ] **Session enforcement** works (login from second device logs out first)

---

## Part 5: Configure Pi Clients (When Hardware Arrives)

### Step 5.1: Update Pi Client Config

On each Raspberry Pi:

```bash
ssh pi@messageboard-alice.local  # or bob

cd ~/messageboard/pi-client
nano config.py
```

Update these values:
```python
MY_USERNAME = "alice"  # or "bob"
API_URL = "https://your-railway-app.up.railway.app/api/messages"
API_KEY = "your-pi-api-key-here"
USE_MOCK_DISPLAY = False  # Set to False for real hardware
```

### Step 5.2: Restart Pi Service

```bash
sudo systemctl restart messageboard
```

### Step 5.3: Test Pi Connection

1. Send a message from the web app
2. Wait 60 seconds
3. Message should appear on the e-ink display
4. Check admin panel - Pi should show "online"

---

## Part 6: Bookmark Important URLs

Save these URLs in your password manager:

**Production URLs:**
- Frontend: `https://your-frontend.vercel.app`
- Backend: `https://your-railway-app.up.railway.app`
- Backend Health: `https://your-railway-app.up.railway.app/health`
- Admin Panel: `https://your-frontend.vercel.app` (click "Admin Panel" on login)

**Dashboard URLs:**
- Railway Dashboard: https://railway.app/dashboard
- Vercel Dashboard: https://vercel.com/dashboard

**Credentials:**
- Master Key: `your-master-key-here`
- Pi API Key: `your-pi-api-key-here`

---

## Part 7: Monitor Your Deployment

### Railway Monitoring

1. Go to Railway dashboard
2. Click on your project
3. Check "Metrics" tab:
   - CPU usage (should be low)
   - Memory usage (should be <200MB)
   - Disk usage (will grow as images are uploaded)

### Vercel Monitoring

1. Go to Vercel dashboard
2. Click on your project
3. Check "Analytics" tab:
   - Page views
   - Response times

### Set Up Billing Alerts (Optional)

**Railway:**
1. Go to Account Settings
2. Set spending limit (e.g., $10/month to avoid surprises)

---

## Troubleshooting

### Frontend Can't Connect to Backend

**Check CORS:**
```bash
# View Railway logs
railway logs

# Look for CORS errors
```

**Fix:** Make sure `CORS_ORIGINS` in Railway matches your Vercel URL exactly (including https://)

### Backend Shows 503 or Crashes

**Check Logs:**
```bash
railway logs --follow
```

**Common Issues:**
- Database not initializing (check for file permissions)
- Environment variables not set correctly
- Out of memory (upgrade Railway plan if needed)

### Admin Panel Shows 404

**Check:**
- Admin endpoints are deployed (`/admin/storage-status`, `/admin/pi-status`)
- Master key is correct
- Backend is running

### Images Not Uploading

**Check Storage:**
- Railway dashboard → Metrics → Disk usage
- If near 4GB, images will fail
- Consider implementing image cleanup or upgrading storage

---

## Cost Breakdown

**Monthly Costs:**
- Railway Hobby: $5/month (includes $5 usage credits)
- Vercel Hobby: $0/month (free forever)
- **Total: $5/month**

**What's Included:**
- Always-on backend (no auto-sleep)
- 4GB image storage (leaves 1GB buffer for database and system files)
- Unlimited frontend deployments
- Global CDN
- Automatic HTTPS
- 100GB bandwidth

---

## Next Steps After Deployment

1. **Monitor for first week** - Check admin panel regularly
2. **Test with partner** - Have them send messages and verify delivery
3. **Set up hardware** - Follow PI_SETUP_GUIDE.md when devices arrive
4. **Document final URLs** - Update private/CREDENTIALS.md with production URLs
5. **Backup configuration** - Save all environment variables securely

---

## 🎉 Deployment Complete!

Your message board system is now live and ready to use!

**Key URLs:**
- Web App: `https://your-frontend.vercel.app`
- Admin Panel: Click "Admin Panel" on login page

**Support:**
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Project Docs: See README.md and other docs in this repo

---

## Quick Reference: Common Commands

```bash
# View Railway logs
railway logs --follow

# Redeploy Railway backend
railway up

# Redeploy Vercel frontend
cd frontend && vercel --prod

# Update Railway environment variable
railway variables set VARIABLE_NAME=value

# Check Railway service status
railway status
```

---

**Last Updated:** January 2025
**Total Setup Time:** ~30 minutes
**Ongoing Maintenance:** Minimal (monitor storage usage monthly)
