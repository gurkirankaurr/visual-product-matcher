import React from "react";

const SearchBar = ({
  search,
  setSearch,
  imageUrl,
  setImageUrl,
  handleFileUpload,
  handleSearch,
  loading,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
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
        onChange={(e) => setImageUrl(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <input type="file" accept="image/*" onChange={handleFileUpload} />

      <button onClick={handleSearch} disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </button>
    </div>
  );
};

export default SearchBar;
