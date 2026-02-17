# Visual Product Matcher

Web app that finds similar products from an uploaded image, image URL, or text search — built with React, Node.js, and the Imagga Vision API.

Live demo: (https://visual-product-matcher-umber.vercel.app/)

---

## What it does

Upload a product photo (or paste a URL) and it returns similar products ranked by relevance. Under the hood, Imagga's API reads the image and returns tags like `sneaker: 98%`, `leather: 77%`, `black: 94%`. Those tags get matched against a local product database of 94 items across 17 categories.

**One thing worth knowing:** this is tag-based matching, not pixel-based. The system figures out *what's in the image* and matches that against product names and categories. It doesn't compare visual embeddings or pixel patterns directly. So if you upload a black running shoe, it'll return other shoes — but it won't necessarily rank a near-identical shoe above a slightly different one the way a true visual search would. See [Future Enhancements](#future-enhancements) for how to get there.

Text search works the same way, just without the API call — type `red leather sneakers` and it keyword-matches against the database directly.

---

## Tech stack

- **Frontend** — React 19 + Vite 7, plain CSS (no UI library)
- **Backend** — Node.js + Express 5, Multer for file uploads
- **AI** — Imagga Vision API (free tier, 1000 requests/month)
- **Data** — 94 products, 17 categories, stored in `products.json`
- **Hosting** — Vercel (frontend) + Render (backend)

---

## Setup

You'll need a free [Imagga account](https://imagga.com) — grab your API key and secret from the dashboard.

**Backend:**
```bash
cd server
cp .env.example .env
# fill in IMAGGA_API_KEY and IMAGGA_API_SECRET
npm install
npm start
# runs on http://localhost:5000
```

**Frontend:**
```bash
cd client
# create .env and add: VITE_API_URL=http://localhost:5000
npm install
npm run dev
# runs on http://localhost:5173
```

---

## Project structure

```
visual-product-matcher/
├── client/
│   └── src/
│       ├── App.jsx       # all UI and state
│       ├── App.css       # styles, CSS variables
│       └── main.jsx
├── server/
│   ├── index.js          # routes, Imagga calls, scoring logic
│   ├── products.json     # product database
│   └── fetchProducts.js  # used to seed the database
├── DEPLOYMENT.md
└── .gitignore
```

---

## API

| Method | Route | Description |
|---|---|---|
| GET | `/health` | returns server status |
| GET | `/products` | list products, supports `?category=` and `?limit=` |
| POST | `/search` | search by image file, URL, or text |

POST `/search` accepts `multipart/form-data` (for file/URL) or `application/json` (for text):

```json
// request
{ "query": "black sneakers" }

// or multipart with field "image" (file) or "imageUrl" (string)

// response
{
  "results": [
    { "id": 3, "name": "Nike Air Max", "category": "mens-shoes", "similarity": 0.92, "price": 89.99 }
  ],
  "tags": [{ "tag": "running shoe", "confidence": 100 }],
  "searchType": "image-file"
}
```

---

## Approach

The main challenge was getting useful results without a vector database or any heavy ML setup. Imagga handles the image understanding — it returns tags with confidence scores, which are matched against the product database in two ways: category mapping (e.g. `sneaker` → mens-shoes, womens-shoes) and direct name matching.

Early versions had a bug where synonym tags like `shoe`, `sneaker`, `footwear` all accumulated toward the same category score, so everything came back at 99%. Fixed by taking only the highest-confidence tag per category (`Math.max` instead of additive), then normalising all scores against the top result. Now you get a realistic spread like 92% / 67% / 41% instead of a flat ceiling.

The frontend keeps it simple — no ML runs in the browser, which keeps load times fast and behaviour consistent across devices.

---

## Future Enhancements

The current setup works well for common product types but has a real limitation: it depends on Imagga returning useful tags. If the image is unusual, low quality, or shows something niche, the tags might be too generic to return good results.

**True visual search with CLIP embeddings**

The proper fix is switching from tag matching to embedding-based search:
- Use [CLIP](https://github.com/openai/CLIP) (free, open source) or the [Hugging Face inference API](https://huggingface.co/openai/clip-vit-base-patch32) to generate a vector embedding for the uploaded image
- Pre-compute embeddings for all 94 products and store them alongside the product data
- At search time, compute cosine similarity between the query embedding and every product embedding
- This gives genuinely visual matching — a photo of a black sneaker will score highest against other black sneakers based on what they actually look like, not just their tags

**Scaling it up**
- Move embeddings into a vector database like [Pinecone](https://pinecone.io) or [Weaviate](https://weaviate.io) (both have free tiers) for faster search as the product count grows
- Expand the product database — 94 items across 17 categories is enough to demo but limited in variety
- Add pagination — currently capped at 12 results
- Cache Imagga responses for repeated image URLs to save API quota