import fs from "fs";
import fetch from "node-fetch";

const categories = [
  "mens-shoes",
  "womens-shoes",
  "mens-shirts",
  "womens-dresses",
  "mens-watches",
  "womens-bags"
];

async function fetchProducts() {
  let allProducts = [];
  let idCounter = 1;

  for (let category of categories) {
    const response = await fetch(
      `https://dummyjson.com/products/category/${category}?limit=10`
    );
    const data = await response.json();

    data.products.forEach((product) => {
      allProducts.push({
        id: idCounter++,
        name: product.title,
        category: product.category,
        image: product.thumbnail,
        embedding: []
      });
    });
  }

  fs.writeFileSync(
    "./products.json",
    JSON.stringify(allProducts.slice(0, 50), null, 2)
  );

  console.log("✅ 50 REAL aligned products saved!");
}

fetchProducts();
