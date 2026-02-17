import axios from "axios";
import fs from "fs";

/**
 * Fetch products from DummyJSON API
 * This will get 100+ products from various categories
 */

const CATEGORIES = [
  "smartphones",
  "laptops",
  "fragrances",
  "skincare",
  "groceries",
  "home-decoration",
  "furniture",
  "tops",
  "womens-dresses",
  "womens-shoes",
  "mens-shirts",
  "mens-shoes",
  "mens-watches",
  "womens-watches",
  "womens-bags",
  "womens-jewellery",
  "sunglasses",
  "automotive",
  "motorcycle",
  "lighting",
];

async function fetchAllProducts() {
  console.log("🔄 Fetching products from DummyJSON API...\n");

  let allProducts = [];
  let productId = 1;

  for (const category of CATEGORIES) {
    try {
      console.log(`   Fetching ${category}...`);

      const response = await axios.get(
        `https://dummyjson.com/products/category/${category}?limit=10`
      );

      const categoryProducts = response.data.products.map((product) => ({
        id: productId++,
        name: product.title,
        category: category,
        image: product.thumbnail,
        price: product.price,
        description: product.description,
        brand: product.brand || "",
        rating: product.rating || 0,
      }));

      allProducts = allProducts.concat(categoryProducts);
      console.log(`   ✓ Added ${categoryProducts.length} products from ${category}`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`   ✗ Error fetching ${category}:`, error.message);
    }
  }

  // Save to products.json
  const outputPath = "./products.json";

  try {
    fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2));
    console.log(`\n✅ Successfully saved ${allProducts.length} products to ${outputPath}`);
    console.log(`\nProduct categories:`);

    // Show category breakdown
    const categoryCount = {};
    allProducts.forEach((p) => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });

    Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} products`);
      });
  } catch (error) {
    console.error("❌ Error saving products:", error.message);
  }
}

// Alternative: Fetch from a single endpoint
async function fetchProductsSimple() {
  console.log("🔄 Fetching products from DummyJSON API (simple mode)...\n");

  try {
    const response = await axios.get(
      "https://dummyjson.com/products?limit=100"
    );

    const products = response.data.products.map((product, index) => ({
      id: index + 1,
      name: product.title,
      category: product.category,
      image: product.thumbnail,
      price: product.price,
      description: product.description,
      brand: product.brand || "",
      rating: product.rating || 0,
    }));

    const outputPath = "./products.json";
    fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));

    console.log(`✅ Successfully saved ${products.length} products to ${outputPath}`);
  } catch (error) {
    console.error("❌ Error fetching products:", error.message);
  }
}

// Run the script
const mode = process.argv[2] || "full";

if (mode === "simple") {
  fetchProductsSimple();
} else {
  fetchAllProducts();
}
