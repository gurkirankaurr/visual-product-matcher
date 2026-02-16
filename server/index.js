import express from "express";
import cors from "cors";
import fs from "fs";
import multer from "multer";
import { cosineSimilarity } from "./utils/cosineSimilarity.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ------------------------------
   FILE UPLOAD CONFIG
--------------------------------*/

const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filename = req.file.originalname
    .toLowerCase()
    .replace(/[-_.]/g, " ")
    .replace(/\.(jpg|png|jpeg|webp)/g, "");

  res.json({ extractedQuery: filename });
});

/* ------------------------------
   LOAD PRODUCTS SAFELY
--------------------------------*/

let products = [];

try {
  products = JSON.parse(
    fs.readFileSync("./products.json", "utf-8")
  );
  console.log(`✅ Loaded ${products.length} products`);
} catch (err) {
  console.error("❌ Failed to load products.json");
  process.exit(1);
}

/* ------------------------------
   EMBEDDING GENERATOR
--------------------------------*/

function generateVectorFromText(text, dimension = 128) {
  const vector = new Array(dimension).fill(0);

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = charCode % dimension;
    vector[index] += charCode / 255;
  }

  return normalize(vector);
}

function normalize(vector) {
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0)
  );
  return vector.map((val) => val / (magnitude || 1));
}

/* ------------------------------
   PRECOMPUTE PRODUCT EMBEDDINGS
--------------------------------*/

products = products.map((product) => {
  const text = `${product.name} ${product.category}`.toLowerCase();
  return {
    ...product,
    embedding: generateVectorFromText(text),
  };
});

/* ------------------------------
   HEALTH CHECK
--------------------------------*/

app.get("/", (req, res) => {
  res.json({
    status: "Server running 🚀",
    totalProducts: products.length,
  });
});

/* ------------------------------
   SEARCH ROUTE
--------------------------------*/

app.post("/search", (req, res) => {
  try {
    const { query, limit = 12 } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        message: "Valid query required",
      });
    }

    const cleanedQuery = query.trim().toLowerCase();
    if (!cleanedQuery) {
      return res.status(400).json({
        message: "Query cannot be empty",
      });
    }

    const queryEmbedding = generateVectorFromText(cleanedQuery);
    const queryWords = cleanedQuery.split(" ");

    const colorWords = [
      "red","black","white","blue",
      "green","brown","yellow","pink","grey"
    ];

    const typeWords = [
      "shoes","sneakers","watch",
      "bag","shirt","dress","boots"
    ];

    const results = products.map((product) => {

      const name = product.name.toLowerCase();
      const category = product.category.toLowerCase();
      const text = `${name} ${category}`;

      /* --- Base Cosine Similarity --- */

      let similarity = cosineSimilarity(
        queryEmbedding,
        product.embedding
      );

      similarity = (similarity + 1) / 2;

      /* --- Smart Boost System --- */

      let boost = 0;

      queryWords.forEach((word) => {

        if (name.split(" ").includes(word)) {
          boost += 0.15;
        }

        else if (text.includes(word)) {
          boost += 0.08;
        }

        if (colorWords.includes(word) && text.includes(word)) {
          boost += 0.25;
        }

        if (category.includes(word)) {
          boost += 0.06;
        }
      });

      /* --- Type Penalty --- */

      typeWords.forEach(type => {
        if (
          queryWords.includes(type) &&
          !text.includes(type)
        ) {
          similarity *= 0.4;
        }
      });

      /* --- Final Score --- */

      let finalScore =
        similarity * 0.75 + boost;

      finalScore = Math.max(
        0,
        Math.min(finalScore, 0.99)
      );

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        similarity: Number(finalScore.toFixed(4)),
      };
    });

    const filteredResults = results
      .filter((r) => r.similarity > 0.18)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    res.json(filteredResults);

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

/* ------------------------------
   START SERVER
--------------------------------*/

const PORT = 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );
});
