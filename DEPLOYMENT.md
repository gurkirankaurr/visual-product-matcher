# 🚀 Deployment Guide

This guide will help you deploy your Visual Product Matcher to production.

## Quick Start

### Option 1: Vercel (Frontend) + Render (Backend)

**Advantages:**
- Free tier available
- Easy setup
- Automatic deployments from Git
- Built-in SSL

---

## 📦 Backend Deployment (Render)

### Step 1: Prepare Your Backend

1. Make sure your `server/package.json` has the start script:
```json
{
  "scripts": {
    "start": "node index.js"
  }
}
```

2. Ensure you have a valid `products.json` file with 50+ products

3. Create `.env.example` (don't commit actual .env)

### Step 2: Deploy to Render

1. **Sign up at [render.com](https://render.com)**

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Settings**
   ```
   Name: visual-product-matcher-api
   Region: Choose nearest to your users
   Branch: main
   Root Directory: server
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Set Environment Variables**
   - Click "Environment"
   - Add:
     ```
     NODE_ENV=production
     PORT=10000
     ```

5. **Deploy!**
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deploy

6. **Get Your API URL**
   - Copy the URL (e.g., `https://visual-product-matcher-api.onrender.com`)
   - Save this for frontend configuration

### Step 3: Test Backend

```bash
curl https://your-api-url.onrender.com/
# Should return: {"status": "Server running 🚀", ...}

curl -X POST https://your-api-url.onrender.com/search \
  -H "Content-Type: application/json" \
  -d '{"query": "red shoes", "limit": 5}'
# Should return product results
```

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Prepare Your Frontend

1. Update `client/.env`:
```env
VITE_API_URL=https://your-render-url.onrender.com
```

2. Test build locally:
```bash
cd client
npm run build
npm run preview
# Visit http://localhost:4173
```

### Step 2: Deploy to Vercel

1. **Sign up at [vercel.com](https://vercel.com)**

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Settings**
   ```
   Framework Preset: Vite
   Root Directory: client
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Set Environment Variables**
   - Click "Environment Variables"
   - Add:
     ```
     VITE_API_URL=https://your-render-url.onrender.com
     ```

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes

6. **Get Your Frontend URL**
   - Vercel gives you: `https://your-app.vercel.app`
   - You can add custom domain later

### Step 3: Test Frontend

1. Visit your Vercel URL
2. Try text search
3. Try image upload
4. Check mobile view
5. Test all features

---

## 🔧 Alternative Deployment Options

### Backend Alternatives

#### Railway
```yaml
# railway.toml
[build]
  builder = "NIXPACKS"

[deploy]
  startCommand = "npm start"
  restartPolicyType = "ON_FAILURE"
```

1. Sign up at [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Select repository
4. Add environment variables
5. Deploy

#### Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
cd server
fly launch

# Deploy
fly deploy
```

### Frontend Alternatives

#### Netlify
```toml
# netlify.toml
[build]
  base = "client"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

1. Sign up at [netlify.com](https://netlify.com)
2. "New site from Git"
3. Select repository
4. Configure build settings
5. Add environment variables
6. Deploy

---

## 🌍 Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=10000
HF_API_KEY=your_key_here (optional)
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com
```

---

## ✅ Post-Deployment Checklist

### Backend
- [ ] Server is running (check health endpoint)
- [ ] /products returns data
- [ ] /search works with text
- [ ] /search works with images
- [ ] Error handling works
- [ ] Logs are accessible

### Frontend
- [ ] Site loads properly
- [ ] Search works
- [ ] Image upload works
- [ ] URL input works
- [ ] Mobile responsive
- [ ] No console errors
- [ ] All images load

### Integration
- [ ] Frontend connects to backend
- [ ] CORS is configured correctly
- [ ] API responses are displayed
- [ ] Error messages show properly

---

## 🐛 Common Issues

### Issue 1: CORS Error

**Symptom:** Frontend can't connect to backend

**Solution:** Add CORS configuration in backend
```javascript
// server/index.js
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

### Issue 2: Build Fails

**Symptom:** Deployment fails during build

**Solution:**
- Check all dependencies are in package.json
- Verify Node version compatibility
- Check for syntax errors
- Review build logs

### Issue 3: Images Not Loading

**Symptom:** Product images show placeholder

**Solution:**
- Check image URLs are accessible
- Verify CORS on image CDN
- Add error handling for images

### Issue 4: Slow Performance

**Symptom:** Search takes too long

**Solutions:**
- Enable caching
- Reduce product count
- Optimize images
- Use CDN

---

## 📊 Monitoring

### Check Backend Health
```bash
# Health check
curl https://your-api.com/health

# Get products
curl https://your-api.com/products?limit=5

# Test search
curl -X POST https://your-api.com/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### Monitor Logs

**Render:**
- Go to Dashboard → Your Service → Logs

**Vercel:**
- Go to Dashboard → Your Project → Deployments → View Logs

---

## 🔄 Continuous Deployment

Both Vercel and Render automatically deploy when you push to main branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Automatic deployment starts!
```

---

## 💰 Cost Estimate

### Free Tier Limits

**Vercel (Frontend):**
- ✅ 100GB bandwidth/month
- ✅ Unlimited projects
- ✅ Custom domains
- ✅ Automatic SSL

**Render (Backend):**
- ✅ 750 hours/month free
- ✅ Automatic SSL
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ Cold starts take ~30 seconds

**Total Cost:** $0/month (free tier)

### If You Exceed Free Tier

**Vercel Pro:** $20/month
**Render Starter:** $7/month

---

## 🎯 Next Steps

After deployment:

1. **Test Everything**
   - All features work
   - Mobile responsive
   - Error handling

2. **Optimize Performance**
   - Enable caching
   - Compress images
   - Minify code

3. **Add Analytics**
   - Google Analytics
   - Vercel Analytics

4. **Custom Domain** (Optional)
   - Buy domain
   - Configure DNS
   - Add to Vercel/Render

5. **Share Your Project!**
   - Add to portfolio
   - Share on LinkedIn
   - Submit for assessment

---

## 📧 Need Help?

- Check service status pages
- Review deployment logs
- Search documentation
- Ask in Discord/community

---

**Good luck with your deployment! 🚀**
