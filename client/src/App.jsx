import { useState, useRef } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [textQuery, setTextQuery] = useState("");

  const [results, setResults] = useState([]);
  const [detectedTags, setDetectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchType, setSearchType] = useState("");

  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState("similarity");

  const fileInputRef = useRef(null);

  /* ── File handling ──────────────────────────────────────────────────── */
  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image too large. Max 10MB.");
      return;
    }
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
    setResults([]);
    setDetectedTags([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  /* ── Search ─────────────────────────────────────────────────────────── */
  const handleSearch = async () => {
    setError("");
    setResults([]);
    setDetectedTags([]);

    // Validate
    if (activeTab === "upload" && !uploadedFile) {
      setError("Please upload an image first.");
      return;
    }
    if (activeTab === "url" && !imageUrl.trim()) {
      setError("Please enter an image URL.");
      return;
    }
    if (activeTab === "url" && imageUrl.trim().startsWith("data:")) {
      setError("Base64 images aren't supported here. Please paste a direct image URL (e.g. https://example.com/shoe.jpg).");
      return;
    }
    if (activeTab === "text" && !textQuery.trim()) {
      setError("Please enter a search query.");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (activeTab === "upload") {
        const formData = new FormData();
        formData.append("image", uploadedFile);
        response = await fetch(`${API_URL}/search`, {
          method: "POST",
          body: formData,
        });
      } else if (activeTab === "url") {
        const formData = new FormData();
        formData.append("imageUrl", imageUrl.trim());
        response = await fetch(`${API_URL}/search`, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(`${API_URL}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textQuery.trim() }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Search failed. Please try again.");
        return;
      }

      setResults(data.results || []);
      setDetectedTags(data.tags || []);
      setSearchType(data.searchType || "");

      if ((data.results || []).length === 0) {
        setError("No matching products found. Try a different image.");
      }
    } catch (err) {
      setError("Could not connect to server. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setPreviewUrl("");
    setImageUrl("");
    setTextQuery("");
    setResults([]);
    setDetectedTags([]);
    setError("");
    setSearchType("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError("");
  };

  /* ── Filter + sort ──────────────────────────────────────────────────── */
  const displayResults = results
    .filter((p) => p.similarity >= minScore)
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return b.similarity - a.similarity;
    });

  const hasInput =
    (activeTab === "upload" && uploadedFile) ||
    (activeTab === "url" && imageUrl.trim()) ||
    (activeTab === "text" && textQuery.trim());

  return (
    <div className="app">
      <div className="bg-grid" />
      <div className="bg-glow" />

      {/* ── Header ── */}
      <header className="header">
        <div className="header-eyebrow">AI-Powered Discovery</div>
        <h1 className="header-title">
          Visual <span className="header-accent">Product</span> Matcher
        </h1>
        <p className="header-sub">
          Upload any product image — our AI identifies what it is and finds similar items instantly.
        </p>
      </header>

      {/* ── Search Panel ── */}
      <section className="search-panel">
        {/* Tabs */}
        <div className="tabs">
          {["upload", "url", "text"].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab === "upload" ? "📷 Upload Image" : tab === "url" ? "🔗 Image URL" : "🔤 Text Search"}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <>
            <div
              className={`drop-zone ${previewUrl ? "has-preview" : ""}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !previewUrl && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {previewUrl ? (
                <div className="preview-wrap">
                  <img src={previewUrl} alt="preview" className="preview-img" />
                  <button
                    className="remove-btn"
                    onClick={(e) => { e.stopPropagation(); handleClear(); }}
                  >✕</button>
                </div>
              ) : (
                <div className="drop-hint">
                  <div className="drop-icon">⬆</div>
                  <div className="drop-text"><strong>Click to upload</strong> or drag and drop</div>
                  <div className="drop-sub">JPG · PNG · WEBP · up to 10MB</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* URL Tab */}
        {activeTab === "url" && (
          <>
            <input
              className="text-input"
              type="text"
              placeholder="https://example.com/product-image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            {imageUrl.trim() && (
              <div className="url-preview">
                <img
                  src={imageUrl}
                  alt="URL preview"
                  className="preview-img small"
                  onError={(e) => e.target.style.display = "none"}
                />
              </div>
            )}
          </>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <input
            className="text-input"
            type="text"
            placeholder="e.g. red leather sneakers, black smartwatch..."
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        )}

        {/* Search Button */}
        <button
          className={`search-btn ${loading ? "loading" : ""}`}
          onClick={handleSearch}
          disabled={loading || !hasInput}
        >
          {loading ? (
            <><span className="btn-spinner" /> Analyzing Image...</>
          ) : (
            <><span>◎</span> Find Similar Products</>
          )}
        </button>

        {loading && activeTab !== "text" && (
          <p className="progress-hint">
            AI is analyzing your image with Imagga Vision API...
          </p>
        )}

        {/* Error */}
        {error && <div className="error-msg">⚠ {error}</div>}
      </section>

      {/* ── Detected Tags ── */}
      {detectedTags.length > 0 && (
        <div className="tags-section">
          <span className="tags-label">🏷 AI detected:</span>
          {detectedTags.map((t) => (
            <span key={t.tag} className="tag">
              {t.tag}
              <span className="tag-conf">{t.confidence.toFixed(0)}%</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {results.length > 0 && (
        <section className="results-section">
          <div className="results-header">
            <div className="results-meta">
              <span className="results-count">{displayResults.length}</span>
              <span className="results-label">
                {searchType === "text" ? "matching" : "visually similar"} products
              </span>
              {searchType !== "text" && (
                <span className="results-badge">Imagga Vision API</span>
              )}
            </div>
            <div className="results-controls">
              <select
                className="control-select"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              >
                <option value={0}>All scores</option>
                <option value={0.1}>10%+ match</option>
                <option value={0.2}>20%+ match</option>
                <option value={0.4}>40%+ match</option>
                <option value={0.6}>60%+ match</option>
              </select>
              <select
                className="control-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="similarity">Best match</option>
                <option value="name">Name A–Z</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          <div className="results-grid">
            {displayResults.map((p, i) => (
              <div
                key={p.id}
                className="product-card"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="card-img-wrap">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="card-img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = `https://picsum.photos/seed/${p.id}/300/300`;
                    }}
                  />
                  <div className="score-badge">
                    {(p.similarity * 100).toFixed(0)}%
                  </div>
                  {i < 3 && <div className="rank-tag">#{i + 1}</div>}
                </div>
                <div className="card-body">
                  <div className="card-category">
                    {p.category.replace(/-/g, " ")}
                  </div>
                  <div className="card-name">{p.name}</div>
                  {p.price && <div className="card-price">${p.price}</div>}
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{ width: `${p.similarity * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {!loading && results.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">◎</div>
          <div className="empty-title">Drop an image to begin</div>
          <div className="empty-sub">
            Upload any product photo and Imagga's AI will identify what it is,<br />
            then match it against {94} products in the database.
          </div>
        </div>
      )}

      <footer className="footer">
        <span>Visual Product Matcher</span>
        <span className="footer-sep">·</span>
        <span>Powered by Imagga Vision API</span>
        <span className="footer-sep">·</span>
        <a href="https://github.com/gurkirankaurr/visual-product-matcher" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
