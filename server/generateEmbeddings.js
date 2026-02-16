import fs from "fs";

const products = JSON.parse(
  fs.readFileSync("./products.json", "utf-8")
);

if (!Array.isArray(products)) {
  throw new Error("products.json must contain an array");
}

function generateImageUrl(name) {
  const seed = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  return `https://picsum.photos/seed/${seed}/400/400`;
}

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

for (let product of products) {
  if (!product.image) {
    product.image = generateImageUrl(product.name);
  }

  if (!product.embedding || product.embedding.length === 0) {
    const combinedText = product.name + " " + product.category;
    product.embedding = generateVectorFromText(combinedText);
  }

  console.log(`Updated: ${product.name}`);
}

fs.writeFileSync(
  "./products.json",
  JSON.stringify(products, null, 2)
);

console.log("\nAll 50 products updated successfully!");
