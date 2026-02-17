import { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [minSimilarity, setMinSimilarity] = useState(0);
  const [sortBy, setSortBy] = useState("similarity");
  const fileInputRef = useRef(null);

  const API_URL = "http://localhost:5000";

  // Handle local file upload with validation
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (JPG, PNG, WEBP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    // Clear previous errors
    setError("");

    // Store the actual file object
    setUploadedFile(file);

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Clear URL input if file uploaded
    setImageUrl("");
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Simulate file input change
      const fakeEvent = { target: { files: [file] } };
      handleFileUpload(fakeEvent);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle image URL input
  const handleImageUrlChange = (url) => {
    setImageUrl(url);
    if (url.trim()) {
      setPreviewUrl(url);
      // Clear file upload if URL is provided
      setUploadedFile(null);
    }
  };

  // Search function with proper FormData handling
  const handleSearch = async () => {
    // Validation
    if (!search.trim() && !uploadedFile && !imageUrl.trim()) {
      setError("Please enter text, upload an image, or paste an image URL.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      let response;

      // Check if we have a file or image URL
      if (uploadedFile || imageUrl.trim()) {
        // Use FormData for file upload
        const formData = new FormData();

        if (uploadedFile) {
          // Direct file upload
          formData.append("image", uploadedFile);
        } else if (imageUrl.trim()) {
          // Image URL - let backend handle it
          formData.append("imageUrl", imageUrl.trim());
        }

        // Add text query if provided (for combined search)
        if (search.trim()) {
          formData.append("query", search.trim());
        }

        response = await axios.post(`${API_URL}/search`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        // Text-only search
        response = await axios.post(`${API_URL}/search`, {
          query: search.trim(),
        });
      }

      setResults(response.data);

      if (response.data.length === 0) {
        setError("No products found. Try different search terms or images.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to fetch results. Please try again."
      );
      console.error("Search error:", err);
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

  // Clear all inputs
  const handleClear = () => {
    setSearch("");
    setImageUrl("");
    setUploadedFile(null);
    setPreviewUrl("");
    setResults([]);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Filter and sort results
  const getFilteredAndSortedResults = () => {
    let filtered = results.filter(
      (product) =>
        product.similarity !== undefined && product.similarity >= minSimilarity
    );

    // Sort results
    switch (sortBy) {
      case "similarity":
        filtered.sort((a, b) => b.similarity - a.similarity);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "category":
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredResults = getFilteredAndSortedResults();

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">🔍 Visual Product Matcher</h1>
        <p className="subtitle">
          Search by text, upload an image, or paste an image URL to find similar
          products
        </p>
      </header>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="Search like 'red shoes' or 'black watch'..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <input
            type="text"
            className="search-input"
            placeholder="Or paste image URL here..."
            value={imageUrl}
            onChange={(e) => handleImageUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Searching...
                </>
              ) : (
                <>
                  <span>🔍</span> Search
                </>
              )}
            </button>

            {(search || imageUrl || uploadedFile || results.length > 0) && (
              <button className="btn btn-secondary" onClick={handleClear}>
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className="upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <div className="upload-content">
            <span className="upload-icon">📁</span>
            <p className="upload-text">
              <strong>Click to upload</strong> or drag and drop
            </p>
            <p className="upload-hint">PNG, JPG, WEBP (max 5MB)</p>
          </div>
        </div>
      </div>

      {/* Uploaded Image Preview */}
      {previewUrl && (
        <div className="preview-section">
          <h3 className="preview-title">Your Search Image</h3>
          <div className="preview-container">
            <img
              src={previewUrl}
              alt="Preview"
              className="preview-image"
              onError={(e) => {
                e.target.src =
                  "https://via.placeholder.com/300x300?text=Invalid+Image";
                setError("Failed to load image. Please try a different one.");
              }}
            />
            <button
              className="preview-remove"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewUrl("");
                setUploadedFile(null);
                setImageUrl("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Filters and Sort */}
      {results.length > 0 && (
        <div className="controls">
          <div className="control-group">
            <label className="control-label">Minimum Match:</label>
            <select
              className="control-select"
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(Number(e.target.value))}
            >
              <option value={0}>All Results</option>
              <option value={0.3}>30%+</option>
              <option value={0.5}>50%+</option>
              <option value={0.7}>70%+</option>
              <option value={0.9}>90%+</option>
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Sort By:</label>
            <select
              className="control-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="similarity">Best Match</option>
              <option value="name">Name (A-Z)</option>
              <option value="category">Category</option>
            </select>
          </div>

          <div className="results-count">
            Showing {filteredResults.length} of {results.length} products
          </div>
        </div>
      )}

      {/* Results Grid */}
      {filteredResults.length > 0 && (
        <div className="results-section">
          <h2 className="results-title">Similar Products</h2>
          <div className="grid">
            {filteredResults.map((product) => (
              <div key={product.id} className="card">
                <div className="card-image-wrapper">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="card-image"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/300x300?text=No+Image";
                    }}
                  />
                  <div className="similarity-badge">
                    {(product.similarity * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="card-title">{product.name}</h3>
                  <p className="card-category">{product.category}</p>
                  {product.price && (
                    <p className="card-price">${product.price}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!loading && filteredResults.length === 0 && results.length > 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h3>No products match your criteria</h3>
          <p>Try adjusting the similarity threshold or search again</p>
        </div>
      )}

      {/* Empty State (No Search Yet) */}
      {!loading && results.length === 0 && !error && (
        <div className="empty-state">
          <span className="empty-icon">👆</span>
          <h3>Start Your Search</h3>
          <p>
            Enter a search term, upload an image, or paste an image URL above
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>
          Built with React + Express • Powered by AI Image Recognition • {" "}
          <a
            href="https://github.com/gurkirankaurr/visual-product-matcher"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
