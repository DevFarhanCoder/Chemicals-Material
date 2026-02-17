# Deployment Guide - Chemical Materials Dashboard

## 🚀 Quick Deploy Guide

### Frontend Deployment (Vercel) - 5 Minutes

1. **Push to GitHub** (already done!)

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repo: `DevFarhanCoder/Chemicals-Material`
   - Select `frontend` folder as root directory
   - Add Environment Variable:
     - `VITE_API_BASE_URL` = Your backend URL (see backend deployment below)
   - Click "Deploy"

3. **Done!** Your frontend is live at `https://your-app.vercel.app`

---

### Backend Deployment (Render.com - FREE) - 10 Minutes

**Why Render?** 
- ✅ Free PostgreSQL database included
- ✅ Easy deployment
- ✅ No credit card required
- ✅ Better for Node.js backends than Vercel

#### Step-by-Step:

1. **Go to [render.com](https://render.com)** and sign up with GitHub

2. **Create PostgreSQL Database:**
   - Click "New +" → "PostgreSQL"
   - Name: `chemicals-db`
   - Plan: Free
   - Click "Create Database"
   - **IMPORTANT**: Copy the "Internal Database URL" (starts with `postgresql://`)

3. **Deploy Backend:**
   - Click "New +" → "Web Service"
   - Connect your repo: `DevFarhanCoder/Chemicals-Material`
   - Settings:
     - **Name**: `chemicals-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Node`
     - **Build Command**: `npm install && npx prisma generate && npm run build`
     - **Start Command**: `npm start`
     - **Plan**: Free

4. **Add Environment Variables:**
   ```
   NODE_ENV=production
   DATABASE_URL=<paste the Internal Database URL from step 2>
   PORT=5000
   CORS_ORIGIN=https://your-frontend.vercel.app
   SCRAPING_CONCURRENCY=2
   SCRAPING_RATE_LIMIT_MS=2000
   SCRAPING_MAX_RETRIES=3
   SCRAPING_TIMEOUT_MS=30000
   HEADLESS_BROWSER=true
   API_RATE_LIMIT_WINDOW_MS=900000
   API_RATE_LIMIT_MAX_REQUESTS=100
   LOG_LEVEL=info
   ```

5. **Click "Create Web Service"**

6. **Run Migrations:**
   - After deployment, go to "Shell" tab
   - Run: `npx prisma migrate deploy`

7. **Your backend is live!** Copy the URL (e.g., `https://chemicals-backend.onrender.com`)

---

### Update Frontend with Backend URL

1. **Go to Vercel Dashboard** → Your project → Settings → Environment Variables

2. **Update `VITE_API_BASE_URL`:**
   ```
   VITE_API_BASE_URL=https://chemicals-backend.onrender.com/api
   ```

3. **Redeploy** (click "Redeploy" button)

4. **Done!** Your full app is live! 🎉

---

## 🌐 Your Live URLs

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://chemicals-backend.onrender.com`
- **Database**: Managed by Render (viewable in Render dashboard)

---

## 🔧 Post-Deployment

### Run Scrapers (First Time)

You need to populate the database:

**Option 1: Render Shell**
```bash
# In Render dashboard → Web Service → Shell tab
npm run scrape
```

**Option 2: Local Script** (if you want to keep scraping locally)
```bash
# Update backend/.env with production DATABASE_URL
cd backend
npm run scrape
```

### View Database

**Render Dashboard:**
- Go to your PostgreSQL database
- Click "Connect" → Use connection string with any PostgreSQL client

**Prisma Studio (Local):**
```bash
cd backend
# Update .env with production DATABASE_URL temporarily
npx prisma studio
```

---

## 📊 Monitoring

### Render Dashboard
- View logs: Web Service → Logs tab
- Monitor usage: Web Service → Metrics tab
- Database stats: PostgreSQL → Metrics tab

### Backend Health Check
```
https://chemicals-backend.onrender.com/health
```
Should return: `{"status":"ok",...}`

---

## 🔐 Security Checklist

- ✅ Never commit `.env` files (already in .gitignore)
- ✅ Use environment variables for all secrets
- ✅ CORS configured for your frontend domain only
- ✅ Rate limiting enabled
- ✅ Helmet security headers active
- ✅ Database password is strong

---

## 🆘 Troubleshooting

### Frontend shows "Network Error"
- Check `VITE_API_BASE_URL` matches your backend URL
- Check CORS_ORIGIN in backend matches your frontend URL
- Verify backend is running: visit `/health` endpoint

### Backend won't deploy
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify DATABASE_URL is set correctly

### Database connection failed
- Check DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Render uses Internal URL for web services (starts with `postgresql://internal...`)
- Run migrations: `npx prisma migrate deploy`

### Scrapers timing out
- Free tier has 512MB RAM limit
- Run scrapers one at a time: `npm run scrape:combi`
- Or increase SCRAPING_TIMEOUT_MS

---

## 💰 Cost

- **Frontend (Vercel)**: FREE (100GB bandwidth/month)
- **Backend (Render)**: FREE (750 hours/month)
- **Database (Render)**: FREE (1GB storage)
- **Total**: $0/month! 🎉

---

## 🚀 Alternative Deployment Options

### Backend Alternatives

1. **Railway.app** 
   - Pros: Simpler than Render, good free tier
   - Cons: Requires credit card for free tier

2. **Fly.io**
   - Pros: Global edge deployment
   - Cons: More complex setup

3. **Heroku**
   - Pros: Classic, well-documented
   - Cons: No free tier anymore

### Frontend Alternatives

1. **Netlify** - Similar to Vercel
2. **Cloudflare Pages** - Fast CDN
3. **GitHub Pages** - For static sites

---

## 📝 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed to Render
- [ ] Database created and connected
- [ ] Migrations run successfully
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] Frontend can reach backend API
- [ ] Health check endpoint working
- [ ] Scrapers run successfully
- [ ] Dashboard loads with data

---

**Need help?** Check the logs in Render/Vercel dashboards or open an issue on GitHub.
