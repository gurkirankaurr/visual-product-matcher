# Deployment

Frontend on Vercel, backend on Render. Both are free.

---

## Backend (Render)

Go to [render.com](https://render.com), connect your GitHub account, and create a new **Web Service** from the repo.

Settings to fill in:
```
Root Directory:  server
Build Command:   npm install
Start Command:   npm start
```

Under **Environment**, add these variables:
```
NODE_ENV=production
PORT=10000
IMAGGA_API_KEY=your_key
IMAGGA_API_SECRET=your_secret
```

First deploy takes 3–5 minutes. Once it's up, copy the URL — you'll need it for the frontend.

Quick test:
```bash
curl https://your-api.onrender.com/health
# { "status": "healthy", "products": 94 }
```

> Render's free tier sleeps after 15 minutes of no traffic. The first request after that takes about 30 seconds to wake up — totally normal, nothing broken.

---

## Frontend (Vercel)

Go to [vercel.com](https://vercel.com), import the same repo, and set:
```
Root Directory:   client
Build Command:    npm run build
Output Directory: dist
```

Add one environment variable:
```
VITE_API_URL=https://your-api.onrender.com
```

Hit deploy. Takes about 2 minutes. Vercel gives you a `.vercel.app` URL when it's done.

---

## Environment files

**server/.env** (local only, don't commit):
```
IMAGGA_API_KEY=your_key
IMAGGA_API_SECRET=your_secret
PORT=5000
```

**server/.env.example** (commit this):
```
IMAGGA_API_KEY=
IMAGGA_API_SECRET=
PORT=5000
```

**client/.env** (local only):
```
VITE_API_URL=http://localhost:5000
```

---

## Auto-deploys

Both Vercel and Render watch the `main` branch. Push a commit and they redeploy automatically — no manual steps needed.

---

## Common issues

**CORS error** — double-check `VITE_API_URL` has no trailing slash and points to the right Render URL.

**Imagga 400 error** — check the API key and secret are set correctly in Render's environment tab. Also check you haven't hit the 1000/month free tier limit.

**Image URL search fails** — Imagga needs to fetch the URL directly. Most direct image links work fine but some CDNs block external access. If a URL fails, download the image and use file upload instead.

**Render service won't start** — make sure Root Directory is `server`, not the repo root. Check the logs in the Render dashboard for the actual error.

**Vercel build fails** — make sure Root Directory is `client` and `VITE_API_URL` is set before building.