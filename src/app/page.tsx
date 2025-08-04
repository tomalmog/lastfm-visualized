// src/app/page.js
"use client"; // This makes it a Client Component (needed for interactivity)

import { useState } from "react";

export default function Home() {
  const [user, setUser] = useState("");
  const [albums, setAlbums] = useState([]);
  const [collage, setCollage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState("10x10"); // Default 10x10

  // Available dimension options
  const dimensionOptions = [
    { value: "4x4", label: "4×4 (16 albums)", count: 16 },
    { value: "5x5", label: "5×5 (25 albums)", count: 25 },
    { value: "6x6", label: "6×6 (36 albums)", count: 36 },
    { value: "7x7", label: "7×7 (49 albums)", count: 49 },
    { value: "8x8", label: "8×8 (64 albums)", count: 64 },
    { value: "9x9", label: "9×9 (81 albums)", count: 81 },
    { value: "10x10", label: "10×10 (100 albums)", count: 100 },
    { value: "11x11", label: "11×11 (121 albums)", count: 121 },
    { value: "12x12", label: "12×12 (144 albums)", count: 144 },
    { value: "13x13", label: "13×13 (169 albums)", count: 169 },
    { value: "14x14", label: "14×14 (196 albums)", count: 196 },
    { value: "15x15", label: "15×15 (225 albums)", count: 225 },
    { value: "16x16", label: "16×16 (256 albums)", count: 256 },
    { value: "20x20", label: "20x20 (400 albums)", count: 400 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const selectedOption = dimensionOptions.find(
      (opt) => opt.value === dimensions
    );
    const albumCount = selectedOption.count;

    setLoading(true);
    try {
      // Fetch albums with the required count
      const res = await fetch(`/api/lastfm?user=${user}&limit=${albumCount}`);
      const data = await res.json();

      if (data.albums) {
        setAlbums(data.albums);

        // Now generate the collage with selected dimensions
        const collageRes = await fetch("/api/generate-collage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            albums: data.albums,
            dimensions: dimensions,
          }),
        });

        const collageData = await collageRes.json();

        if (collageData.image) {
          setCollage(collageData.image);
        } else {
          alert(
            "Failed to generate collage: " +
              (collageData.error || "Unknown error")
          );
        }
      } else {
        alert("Failed to fetch albums: " + (data.error || "Unknown error"));
        setAlbums([]);
      }
    } catch (err) {
      alert("Error: Could not connect to API.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = dimensionOptions.find(
    (opt) => opt.value === dimensions
  );

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Last.fm Album Collage Generator
      </h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Enter your Last.fm username"
            className="flex-grow p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <label
              htmlFor="dimensions"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Collage Dimensions
            </label>
            <select
              id="dimensions"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dimensionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition disabled:bg-blue-400 whitespace-nowrap"
            >
              {loading ? "Loading..." : "Generate Collage"}
            </button>
          </div>
        </div>

        {selectedOption && (
          <p className="text-sm text-gray-600">
            This will create a {selectedOption.label.split(" ")[0]} grid using
            your top {selectedOption.count} albums.
          </p>
        )}
      </form>

      {/* Results */}
      {loading && (
        <div className="text-center">
          <p>Fetching your top {selectedOption?.count} albums...</p>
          <p className="text-sm text-gray-500 mt-1">
            This may take a moment...
          </p>
        </div>
      )}

      {!loading && albums.length === 0 && !loading && (
        <p className="text-gray-500 text-center">
          Enter your Last.fm username and select your preferred dimensions to
          generate your album collage.
        </p>
      )}

      {albums.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">
            Top {albums.length} Albums for "{user}"
          </h2>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 max-h-96 overflow-y-auto border rounded p-4">
            {albums.map((album, index) => (
              <div key={index} className="text-center">
                <img
                  src={album.coverUrl || "/placeholder-album.png"} // Fallback to placeholder
                  alt={`${album.name} cover`}
                  className="w-full aspect-square object-cover rounded shadow"
                  onError={(e) => {
                    // If image fails to load, hide it or use a placeholder
                    e.target.style.display = "none";
                  }}
                />
                <p
                  className="text-xs mt-1 truncate"
                  title={`${album.name} - ${album.artist}`}
                >
                  {album.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {collage && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">
            Your {dimensions.replace("x", "x")} Color Sorted Collage
          </h2>
          <div className="flex justify-center">
            <img
              src={collage}
              alt="Album collage sorted by color"
              className="border rounded shadow-lg max-w-full h-auto"
              style={{ maxHeight: "80vh" }}
            />
          </div>
          <div className="mt-4 text-center">
            <a
              href={collage}
              download={`${user}-${dimensions}-album-collage.jpg`}
              className="inline-block bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 transition"
            >
              Download Collage
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
