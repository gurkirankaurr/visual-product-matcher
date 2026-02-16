import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [minSimilarity, setMinSimilarity] = useState(0);

  // Handle local file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setUploadedImage(previewUrl);
      setImageUrl(""); // Clear URL if file uploaded
    }
  };

  // Search function
  const handleSearch = async () => {
    if (!search.trim() && !uploadedImage && !imageUrl.trim()) {
      setError("Please enter text or upload/paste an image.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await axios.post("http://localhost:5000/search", {
        query: search,
        imageUrl: uploadedImage || imageUrl,
      });

      setResults(res.data);
    } catch (err) {
      setError("Failed to fetch results. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Press Enter to Search
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const filteredResults = results.filter(
    (product) =>
      product.similarity !== undefined &&
      product.similarity >= minSimilarity
  );

  return (
    <div className="container">
      <h1 className="title">Visual Product Matcher</h1>

      {/* Search Section */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search like 'red shoes'..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <input
          type="text"
          placeholder="Or paste image URL..."
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            setUploadedImage(null); // Clear file if URL pasted
          }}
          onKeyDown={handleKeyDown}
        />

        <input type="file" accept="image/*" onChange={handleFileUpload} />

        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Uploaded Image Preview */}
      {(uploadedImage || imageUrl) && (
        <div className="preview">
          <h3>Uploaded Image</h3>
          <img
            src={uploadedImage || imageUrl}
            alt="Uploaded"
            onError={(e) => {
              e.target.src =
                "https://via.placeholder.com/200?text=Invalid+Image";
            }}
          />
        </div>
      )}

      {/* Similarity Filter */}
      {results.length > 0 && (
        <div className="filter">
          <label>Minimum Match: </label>
          <select
            value={minSimilarity}
            onChange={(e) => setMinSimilarity(Number(e.target.value))}
          >
            <option value={0}>All</option>
            <option value={0.5}>50%+</option>
            <option value={0.7}>70%+</option>
            <option value={0.9}>90%+</option>
          </select>
        </div>
      )}

      {/* Error */}
      {error && <p className="error">{error}</p>}

      {/* Results Grid */}
      <div className="grid">
        {filteredResults.map((product) => (
          <div key={product.id} className="card">
            <img
              src={product.image}
              alt={product.name}
              onError={(e) => {
                e.target.src =
                  "https://via.placeholder.com/200?text=No+Image";
              }}
            />

            <div className="card-content">
              <h3>{product.name}</h3>
              <p className="category">{product.category}</p>
              <p className="similarity">
                Match:{" "}
                {product.similarity
                  ? (product.similarity * 100).toFixed(2)
                  : 0}
                %
              </p>
            </div>
          </div>
        ))}
      </div>

      {!loading && filteredResults.length === 0 && results.length > 0 && (
        <p className="no-results">No products found above selected similarity.</p>
      )}
    </div>
  );
}

export default App;
