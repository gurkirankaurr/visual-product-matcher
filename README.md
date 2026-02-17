# 🔍 Visual Product Matcher

A web application that finds visually similar products from any uploaded image using the **Imagga Vision API**.

## How It Works

1. User uploads any image (photo, screenshot, anything)
2. Image is sent to the **Imagga AI API** which returns descriptive tags (e.g. `sneaker`, `red`, `nike`, `athletic shoe`)
3. Tags are matched against the product database using a scoring algorithm
4. Similar products are returned ranked by relevance

## Setup

### 1. Get a Free Imagga API Key
- Sign up at [imagga.com](https://imagga.com) — free tier (1000 requests/month)
- Go to Dashboard → copy your **API Key** and **API Secret**

### 2. Server
```bash
cd server
cp .env.example .env
# Add your keys to .env:
# IMAGGA_API_KEY=your_key
# IMAGGA_API_SECRET=your_secret
npm install
npm start
```

### 3. Client
```bash
cd client
npm install
npm run dev
```

## Features
- 📸 Upload any image file (JPG, PNG, WEBP, up to 10MB)
- 🔗 Paste any image URL
- 🔤 Text search fallback
- 🏷️ Shows detected AI tags with confidence scores
- 🎛️ Filter by match score, sort by name/category
- 📱 Mobile responsive

## Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express + Multer
- **AI:** Imagga Vision API (free tier)
- **Database:** 94 products across 17 categories

## Approach (200 words)

The core challenge was making image search genuinely visual rather than keyword-based. The solution uses the Imagga Vision API as the image understanding layer.

When a user uploads any image, the Express server forwards it to Imagga's tagging endpoint, which returns a list of descriptive tags with confidence scores (e.g. `sneaker: 98%`, `red: 94%`, `athletic: 87%`). These tags are then used in two ways: first, a tag-to-category mapping identifies which product categories are relevant (e.g. `sneaker` → mens-shoes, womens-shoes); second, direct tag matching against product names and categories adds further precision.

The final similarity score combines category relevance (weighted by tag confidence) with direct name/category text matching and color boosting. Products are ranked by this score and returned to the frontend.

The frontend is intentionally simple — no ML runs client-side. This means zero browser compatibility issues, instant load times, and the same experience on any device.

Text search is also supported as a fallback using keyword matching with color and type boosting. The system requires only an Imagga API key to run, which is free to obtain.
