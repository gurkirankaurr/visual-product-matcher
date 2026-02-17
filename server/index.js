import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── File Upload ─────────────────────────────────────────────────────────── */
// memoryStorage: file lives in req.file.buffer (never touches disk, no extension issues)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

/* ── Load Products ───────────────────────────────────────────────────────── */
let products = [];
try {
  products = JSON.parse(fs.readFileSync(path.join(__dirname, "products.json"), "utf-8"));
  console.log(`✅ Loaded ${products.length} products`);
} catch (err) {
  console.error("❌ Failed to load products.json:", err.message);
  process.exit(1);
}

/* ── Tag → Category mapping ──────────────────────────────────────────────── */
const TAG_CATEGORY_MAP = {
  shoe: ["mens-shoes", "womens-shoes"], shoes: ["mens-shoes", "womens-shoes"],
  sneaker: ["mens-shoes", "womens-shoes"], sneakers: ["mens-shoes", "womens-shoes"],
  footwear: ["mens-shoes", "womens-shoes"], boot: ["mens-shoes", "womens-shoes"],
  boots: ["mens-shoes", "womens-shoes"], heel: ["womens-shoes"], heels: ["womens-shoes"],
  watch: ["mens-watches", "womens-watches"], watches: ["mens-watches", "womens-watches"],
  timepiece: ["mens-watches", "womens-watches"], wristwatch: ["mens-watches", "womens-watches"],
  bag: ["womens-bags"], handbag: ["womens-bags"], purse: ["womens-bags"], tote: ["womens-bags"],
  backpack: ["womens-bags"], phone: ["smartphones"], smartphone: ["smartphones"],
  mobile: ["smartphones"], iphone: ["smartphones"], laptop: ["laptops"],
  computer: ["laptops"], notebook: ["laptops"],
  shirt: ["mens-shirts", "tops"], tshirt: ["mens-shirts", "tops"],
  dress: ["womens-dresses", "tops"], clothing: ["mens-shirts", "womens-dresses", "tops"],
  jewelry: ["womens-jewellery"], earring: ["womens-jewellery"],
  necklace: ["womens-jewellery"], ring: ["womens-jewellery"],
  sunglasses: ["sunglasses"], glasses: ["sunglasses"], eyewear: ["sunglasses"],
  perfume: ["fragrances"], fragrance: ["fragrances"], cologne: ["fragrances"],
  furniture: ["furniture"], sofa: ["furniture"], chair: ["furniture"],
  bed: ["furniture"], table: ["furniture"],
  decoration: ["home-decoration"], decor: ["home-decoration"],
  motorcycle: ["motorcycle"], bike: ["motorcycle"],
  food: ["groceries"], fruit: ["groceries"], vegetable: ["groceries"],
};

const COLOR_WORDS = [
  "red","black","white","blue","green","brown","yellow",
  "pink","grey","gray","orange","purple","gold","silver","beige","navy","cream","tan",
];

/* ── Detect real MIME type from magic bytes ──────────────────────────────── */
// NEVER trust browser-declared mimetype — .png files often contain JPEG bytes.
// Imagga checks actual bytes vs Content-Type and returns 400 on mismatch.
function detectMime(buffer) {
  const b = buffer;
  if (b[0]===0x89 && b[1]===0x50 && b[2]===0x4e && b[3]===0x47) return { mime:"image/png",  ext:"png"  };
  if (b[0]===0xff && b[1]===0xd8)                                  return { mime:"image/jpeg", ext:"jpg"  };
  if (b[0]===0x47 && b[1]===0x49 && b[2]===0x46)                  return { mime:"image/gif",  ext:"gif"  };
  if (b[8]===0x57 && b[9]===0x45 && b[10]===0x42 && b[11]===0x50) return { mime:"image/webp", ext:"webp" };
  return { mime:"image/jpeg", ext:"jpg" }; // safe default
}

/* ── Imagga API call ─────────────────────────────────────────────────────── */
async function getImageTags(imageSource, sourceType) {
  const apiKey    = process.env.IMAGGA_API_KEY;
  const apiSecret = process.env.IMAGGA_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("IMAGGA_API_KEY and IMAGGA_API_SECRET must be set in .env");

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  let response;

  if (sourceType === "url") {
    if (imageSource.startsWith("data:")) throw new Error("Paste a real https:// URL, not a base64 image.");
    response = await fetch(
      `https://api.imagga.com/v2/tags?image_url=${encodeURIComponent(imageSource)}&limit=30`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
  } else {
    // Use native Node.js Blob + FormData (no npm packages, no boundary bugs).
    // Detect real format from magic bytes — browser always lies about .png files.
    const { mime, ext } = detectMime(imageSource.buffer);
    console.log(`  📸 Real format: ${mime} (browser declared: ${imageSource.mimetype})`);

    const blob = new Blob([imageSource.buffer], { type: mime });
    const fd   = new FormData();
    fd.append("image", blob, `upload.${ext}`);

    response = await fetch("https://api.imagga.com/v2/tags?limit=30", {
      method:  "POST",
      headers: { Authorization: `Basic ${auth}` },
      // Do NOT set Content-Type manually — fetch sets it automatically with the correct boundary
      body: fd,
    });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Imagga API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  if (!data.result?.tags) throw new Error("Imagga returned no tags");

  return data.result.tags
    .filter(t => t.confidence > 15)
    .map(t => ({ tag: t.tag.en.toLowerCase(), confidence: t.confidence }));
}

/* ── Match products ──────────────────────────────────────────────────────── */
function matchProducts(tags, limit = 12) {
  const tagNames = tags.map(t => t.tag);
  const tagMap   = Object.fromEntries(tags.map(t => [t.tag, t.confidence]));

  const categoryScores = {};
  tagNames.forEach(tag => {
    (TAG_CATEGORY_MAP[tag] || []).forEach(cat => {
      categoryScores[cat] = (categoryScores[cat] || 0) + (tagMap[tag] / 100);
    });
  });

  console.log("📊 Category scores:", categoryScores);
  console.log("🏷️  Top tags:", tagNames.slice(0, 10));

  return products
    .map(product => {
      const name = product.name.toLowerCase();
      const cat  = product.category.toLowerCase();
      let score  = 0;
      if (categoryScores[cat]) score += categoryScores[cat] * 0.5;
      tagNames.forEach(tag => {
        const conf = tagMap[tag] / 100;
        if (name.includes(tag))               score += conf * 0.35;
        else if (`${name} ${cat}`.includes(tag)) score += conf * 0.2;
        if (COLOR_WORDS.includes(tag) && `${name} ${cat}`.includes(tag)) score += conf * 0.25;
      });
      return { id: product.id, name: product.name, category: product.category,
               image: product.image, price: product.price, brand: product.brand,
               similarity: Number(Math.min(score, 0.99).toFixed(4)) };
    })
    .filter(r => r.similarity > 0.05)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/* ── Text search ─────────────────────────────────────────────────────────── */
function textSearch(query, limit = 12) {
  const words = query.toLowerCase().split(/\s+/);
  return products
    .map(product => {
      const name = product.name.toLowerCase();
      const cat  = product.category.toLowerCase();
      let score  = 0;
      words.forEach(w => {
        if (w.length < 2) return;
        if (name.includes(w))               score += 0.35;
        else if (`${name} ${cat}`.includes(w)) score += 0.2;
        if (COLOR_WORDS.includes(w) && `${name} ${cat}`.includes(w)) score += 0.3;
      });
      return { id: product.id, name: product.name, category: product.category,
               image: product.image, price: product.price, brand: product.brand,
               similarity: Number(Math.min(score, 0.99).toFixed(4)) };
    })
    .filter(r => r.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/* ── Routes ──────────────────────────────────────────────────────────────── */
app.get("/", (req, res) => res.json({
  status: "ok", version: "FIXED-v4", products: products.length,
  imagga: !!(process.env.IMAGGA_API_KEY && process.env.IMAGGA_API_SECRET),
}));

app.get("/health", (req, res) => res.json({ status: "healthy", products: products.length }));

app.get("/products", (req, res) => {
  const { category, limit = 200 } = req.query;
  let list = products;
  if (category) list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  res.json(list.slice(0, parseInt(limit)).map(({ id, name, category, image, price, brand, rating }) =>
    ({ id, name, category, image, price, brand, rating })
  ));
});

/* ── Search ──────────────────────────────────────────────────────────────── */
app.post("/search", upload.single("image"), async (req, res) => {
  const { query, imageUrl, limit = 12 } = req.body;
  const uploadedFile = req.file;

  console.log("\n🔍 Search request");
  console.log("  file:", uploadedFile?.originalname || "none");
  console.log("  buffer:", uploadedFile?.buffer?.length ?? 0, "bytes");
  console.log("  url:", imageUrl || "none");
  console.log("  query:", query || "none");

  try {
    if (uploadedFile) {
      let tags;
      try {
        tags = await getImageTags(uploadedFile, "file");
        console.log(`  ✅ Tags (${tags.length}):`, tags.slice(0, 5).map(t => t.tag));
      } catch (e) {
        console.error("  ❌ Imagga error:", e.message);
        return res.status(500).json({ message: "Image analysis failed: " + e.message });
      }
      return res.json({ results: matchProducts(tags, parseInt(limit)), tags: tags.slice(0, 10), searchType: "image-file" });
    }

    if (imageUrl?.trim()) {
      let tags;
      try {
        tags = await getImageTags(imageUrl.trim(), "url");
        console.log(`  ✅ Tags (${tags.length}):`, tags.slice(0, 5).map(t => t.tag));
      } catch (e) {
        console.error("  ❌ Imagga error:", e.message);
        return res.status(500).json({ message: "Image analysis failed: " + e.message });
      }
      return res.json({ results: matchProducts(tags, parseInt(limit)), tags: tags.slice(0, 10), searchType: "image-url" });
    }

    if (query?.trim()) {
      const results = textSearch(query.trim(), parseInt(limit));
      console.log(`  ✅ Text: ${results.length} results`);
      return res.json({ results, tags: [], searchType: "text" });
    }

    return res.status(400).json({ message: "Provide an image file, image URL, or text query" });

  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ message: "Search failed: " + error.message });
  }
});

/* ── Error handler ───────────────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ message: "File too large. Max 10MB." });
  res.status(500).json({ message: err.message || "Internal server error" });
});

/* ── Start ───────────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════╗
║  Visual Product Matcher  [FIXED-v4]      ║
╠══════════════════════════════════════════╣
║  Port:    ${PORT}                            ║
║  Products: ${products.length}                           ║
║  Imagga:  ${(process.env.IMAGGA_API_KEY && process.env.IMAGGA_API_SECRET) ? "✅ Configured" : "❌ Missing keys"}             ║
╚══════════════════════════════════════════╝
`));