import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import dotenv from "dotenv";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ------------------------------
   COSINE SIMILARITY FUNCTION
--------------------------------*/

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    console.error("Invalid vectors for similarity calculation");
    return 0;
  }
  
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot; // vectors already normalized
}

/* ------------------------------
   FILE UPLOAD CONFIGURATION
--------------------------------*/

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

/* ------------------------------
   LOAD PRODUCTS
--------------------------------*/

let products = [];

try {
  const productPath = path.join(__dirname, "products.json");
  const productData = fs.readFileSync(productPath, "utf-8");
  products = JSON.parse(productData);
  console.log(`✅ Loaded ${products.length} products`);
} catch (err) {
  console.error("❌ Failed to load products.json:", err.message);
  process.exit(1);
}

/* ------------------------------
   EMBEDDING FUNCTIONS
--------------------------------*/

function normalize(vector) {
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0)
  );
  return vector.map((val) => val / (magnitude || 1));
}

function generateEnhancedEmbedding(text) {
  const dimension = 128;
  const vector = new Array(dimension).fill(0);

  const cleanText = text.toLowerCase().trim();
  const words = cleanText.split(/\s+/);

  // Word-level embeddings
  words.forEach((word, wordIndex) => {
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const index = (charCode + wordIndex * 7) % dimension;
      vector[index] += (charCode / 255) * (1 + wordIndex * 0.1);
    }
  });

  // Bigram features
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + words[i + 1];
    const hash = bigram.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    const index = Math.abs(hash) % dimension;
    vector[index] += 0.5;
  }

  return normalize(vector);
}

function extractTextFromFilename(filename) {
  const nameWithoutExt = path.parse(filename).name;
  let text = nameWithoutExt
    .replace(/[-_]/g, " ")
    .replace(/[0-9]/g, "")
    .toLowerCase()
    .trim();
  
  if (text.length < 3) {
    text = "product";
  }
  
  return text;
}

function extractTextFromUrl(url) {
  try {
    // Get the full path, not just the last part
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Extract all meaningful parts
    const parts = pathname.split('/').filter(part => 
      part && 
      part.length > 2 && 
      !part.match(/^\d+$/) && // Ignore pure numbers
      !part.match(/\.(jpg|jpeg|png|gif|webp)$/i) // Ignore just extensions
    );
    
    // Join parts and clean
    let text = parts.join(' ')
      .replace(/[-_]/g, ' ')
      .replace(/\.(jpg|jpeg|png|gif|webp)/gi, '')
      .toLowerCase()
      .trim();
    
    // If still too short or generic
    if (text.length < 3 || text === 'image' || text === 'photo') {
      text = 'product';
    }
    
    console.log(`   URL extraction: "${url}" → "${text}"`);
    return text;
  } catch (error) {
    console.error("Error extracting text from URL:", error);
    return "product";
  }
}

/* ------------------------------
   PRECOMPUTE EMBEDDINGS
--------------------------------*/

console.log("🔄 Generating product embeddings...");
products = products.map((product, index) => {
  const text = `${product.name} ${product.category}`.toLowerCase();
  const embedding = generateEnhancedEmbedding(text);

  if ((index + 1) % 20 === 0) {
    console.log(`   Processed ${index + 1}/${products.length} products`);
  }

  return {
    ...product,
    embedding,
  };
});
console.log("✅ Product embeddings generated");

/* ------------------------------
   ROUTES
--------------------------------*/

app.get("/", (req, res) => {
  res.json({
    status: "Server running 🚀",
    totalProducts: products.length,
    endpoints: {
      search: "POST /search",
      products: "GET /products",
      health: "GET /health",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    products: products.length,
  });
});

app.get("/products", (req, res) => {
  try {
    const { limit = 100, category } = req.query;
    let filteredProducts = products;

    if (category) {
      filteredProducts = products.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    const result = filteredProducts.slice(0, parseInt(limit)).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      image: p.image,
      price: p.price,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* ------------------------------
   SEARCH ROUTE
--------------------------------*/

app.post("/search", upload.single("image"), async (req, res) => {
  try {
    const { query, imageUrl, limit = 12 } = req.body;
    const uploadedFile = req.file;

    let queryEmbedding;
    let searchType = "text";
    let extractedText = "";

    console.log("\n🔍 New search request");
    console.log("Query:", query || "none");
    console.log("ImageUrl:", imageUrl || "none");
    console.log("File:", uploadedFile ? uploadedFile.originalname : "none");

    // Determine search type
    if (uploadedFile) {
      searchType = "image-file";
      extractedText = extractTextFromFilename(uploadedFile.originalname);
      console.log("✅ Extracted from file:", extractedText);
      queryEmbedding = generateEnhancedEmbedding(extractedText);

      // Clean up file
      setTimeout(() => {
        try {
          fs.unlinkSync(uploadedFile.path);
        } catch (err) {
          console.error("Cleanup error:", err.message);
        }
      }, 1000);

    } else if (imageUrl && imageUrl.trim()) {
      searchType = "image-url";
      extractedText = extractTextFromUrl(imageUrl.trim());
      console.log("✅ Extracted from URL:", extractedText);
      queryEmbedding = generateEnhancedEmbedding(extractedText);

    } else if (query && query.trim()) {
      searchType = "text";
      extractedText = query.trim().toLowerCase();
      console.log("✅ Text query:", extractedText);
      queryEmbedding = generateEnhancedEmbedding(extractedText);

    } else {
      return res.status(400).json({
        message: "Please provide a query, image file, or image URL",
      });
    }

    if (!queryEmbedding || queryEmbedding.length === 0) {
      return res.status(400).json({
        message: "Failed to generate embedding",
      });
    }

    const queryWords = extractedText.toLowerCase().split(/\s+/);

    const colorWords = [
      "red", "black", "white", "blue", "green", "brown",
      "yellow", "pink", "grey", "gray", "orange", "purple",
      "gold", "silver", "beige", "navy"
    ];

    const typeWords = [
      "shoes", "sneakers", "watch", "watches", "bag", "bags",
      "shirt", "dress", "boots", "sunglasses", "phone",
      "laptop", "jewelry", "fragrance", "furniture"
    ];

    // Calculate similarity
    const results = products.map((product) => {
      const name = product.name.toLowerCase();
      const category = product.category.toLowerCase();
      const text = `${name} ${category}`;

      let similarity = cosineSimilarity(queryEmbedding, product.embedding);
      similarity = (similarity + 1) / 2;

      let boost = 0;

      queryWords.forEach((word) => {
        if (word.length < 2) return;

        if (name.includes(word)) {
          boost += 0.2;
        } else if (text.includes(word)) {
          boost += 0.1;
        }

        if (colorWords.includes(word) && text.includes(word)) {
          boost += 0.25;
        }

        if (category.includes(word)) {
          boost += 0.08;
        }
      });

      typeWords.forEach((type) => {
        if (queryWords.includes(type) && !text.includes(type)) {
          similarity *= 0.5;
        }
      });

      let finalScore = similarity * 0.7 + boost;
      finalScore = Math.max(0, Math.min(finalScore, 0.99));

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        price: product.price,
        similarity: Number(finalScore.toFixed(4)),
      };
    });

    const minSimilarity = searchType === "text" ? 0.15 : 0.1;

    const filteredResults = results
      .filter((r) => r.similarity > minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, parseInt(limit));

    console.log(`✅ Returning ${filteredResults.length} results`);
    if (filteredResults.length > 0) {
      console.log(`Top result: ${filteredResults[0].name} (${(filteredResults[0].similarity * 100).toFixed(1)}%)`);
    }

    res.json(filteredResults);

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error("Stack:", error.stack);
    
    res.status(500).json({
      message: "Search failed",
      error: error.message,
    });
  }
});

/* ------------------------------
   ERROR HANDLING
--------------------------------*/

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large. Max 5MB.",
      });
    }
    return res.status(400).json({
      message: err.message,
    });
  }

  res.status(500).json({
    message: err.message || "Internal server error",
  });
});

/* ------------------------------
   START SERVER
--------------------------------*/

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🚀 Visual Product Matcher Server    ║
╠═══════════════════════════════════════╣
║  Port:     ${PORT}                        ║
║  Products: ${products.length} loaded                 ║
║  Status:   ✅ Ready                    ║
╚═══════════════════════════════════════╝

Server: http://localhost:${PORT}
Uploads: ${uploadsDir}
  `);
});

process.on("SIGINT", () => {
  console.log("\n⚠️  Shutting down...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
