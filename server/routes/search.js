app.post("/search", (req, res) => {
  try {
    const { query, limit = 12 } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "Valid query required" });
    }

    const cleanedQuery = query.trim().toLowerCase();
    if (!cleanedQuery) {
      return res.status(400).json({ message: "Query cannot be empty" });
    }

    const queryWords = cleanedQuery.split(" ");

    const colorWords = [
      "red", "black", "white", "blue",
      "green", "brown", "yellow", "pink"
    ];

    const results = products.map((product) => {

      const name = product.name.toLowerCase();
      const category = product.category.toLowerCase();
      const text = `${name} ${category}`;

      let score = 0;

      queryWords.forEach((word) => {

        // Exact word match
        if (name.split(" ").includes(word)) {
          score += 0.4;
        }

        // Partial match
        else if (text.includes(word)) {
          score += 0.2;
        }

        // Strong color boost
        if (colorWords.includes(word) && text.includes(word)) {
          score += 0.35;
        }
      });

      // If product doesn't contain main type word (like shoes)
      const typeWords = ["shoes", "sneakers", "watch", "bag"];
      typeWords.forEach(type => {
        if (
          queryWords.includes(type) &&
          !text.includes(type)
        ) {
          score *= 0.4;
        }
      });

      score = Math.min(score, 0.99);

      return {
        ...product,
        similarity: Number(score.toFixed(4))
      };
    });

    const filtered = results
      .filter(r => r.similarity > 0.15)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    res.json(filtered);

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
