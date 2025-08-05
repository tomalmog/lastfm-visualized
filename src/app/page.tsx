// src/app/page.js
"use client";

import { Analytics } from "@vercel/analytics/next";
import { Graduate } from "next/font/google";
import { useState } from "react";

interface Album {
  name: string;
  artist: string;
  coverUrl: string;
}

// Image validation function with timeout
const validateImageUrl = (
  url: string,
  timeout = 5000
): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url || url.trim() === "" || !url.includes("http")) {
      resolve(null);
      return;
    }

    const img = new Image();
    const timer = setTimeout(() => {
      resolve(null); // Timeout - treat as invalid
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve(url); // Valid image
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null); // Invalid image
    };

    img.src = url;
  });
};

export default function Home() {
  const [user, setUser] = useState<string>("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [collage, setCollage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [width, setWidth] = useState<number | string>(10);
  const [height, setHeight] = useState<number | string>(10);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [gridSize, setGridSize] = useState<string>("");
  const [sufficientAlbums, setSufficientAlbums] = useState<boolean>(true);
  const [finalCount, setFinalCount] = useState<number>(100);
  const [showAlbums, setShowAlbums] = useState(false);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setWidth("");
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        setWidth(numValue);
      }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setHeight("");
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        setHeight(numValue);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    // Convert empty strings to 1 and validate
    const finalWidth = width === "" ? 1 : Number(width);
    const finalHeight = height === "" ? 1 : Number(height);

    if (
      finalWidth < 1 ||
      finalWidth > 20 ||
      finalHeight < 1 ||
      finalHeight > 20
    ) {
      alert("Width and height must be between 1 and 20");
      return;
    }

    const albumCount = finalWidth * finalHeight;
    const dimensions = `${finalWidth}x${finalHeight}`;

    setLoading(true);
    setProgress(0);
    setStatus("Fetching albums from Last.fm...");

    try {
      // Fetch albums with the required count
      const res = await fetch(`/api/lastfm?user=${user}&limit=${albumCount}`);
      const data = await res.json();

      if (data.albums) {
        setAlbums(data.albums);
        setProgress(20);
        setStatus("Validating album cover images...");

        // Validate images before generating collage
        console.log("Validating album cover images...");
        const validatedAlbums = await Promise.all(
          data.albums.map(async (album: Album, index: number) => {
            const validUrl = await validateImageUrl(album.coverUrl, 3000);
            const progressPercent = Math.round(
              20 + ((index + 1) / data.albums.length) * 50
            );
            setProgress(progressPercent);

            return {
              ...album,
              coverUrl: validUrl || "/placeholder-album.png",
            };
          })
        );

        console.log(`Validated ${validatedAlbums.length} albums`);
        setProgress(70);
        setStatus("Generating collage...");

        // Now generate the collage with validated albums
        const collageRes = await fetch("/api/generate-collage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            albums: validatedAlbums,
            dimensions: dimensions,
          }),
        });

        const collageData = await collageRes.json();
        setProgress(90);

        if (collageData.image) {
          setGridSize(collageData.gridSize);
          setSufficientAlbums(collageData.sufficientAlbums);
          setFinalCount(collageData.finalCount);
          setCollage(collageData.image);
          setProgress(100);
          setStatus("Collage generated successfully!");
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
      setStatus("Error occurred");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setProgress(0);
        setStatus("");
      }, 2000);
    }
  };

  const albumCount =
    (width === "" ? 1 : Number(width)) * (height === "" ? 1 : Number(height));

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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUser(e.target.value)
            }
            placeholder="Enter your Last.fm username"
            className="flex-grow p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex gap-4 flex-grow">
            <div className="flex-1">
              <label
                htmlFor="width"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Width
              </label>
              <input
                id="width"
                type="number"
                min="1"
                max="20"
                value={width}
                onChange={handleWidthChange}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Max: 20</p>
            </div>

            <div className="flex-1">
              <label
                htmlFor="height"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Height
              </label>
              <input
                id="height"
                type="number"
                min="1"
                max="20"
                value={height}
                onChange={handleHeightChange}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Max: 20</p>
            </div>
          </div>

          <div className="flex-shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition disabled:bg-blue-400 whitespace-nowrap"
            >
              {loading ? "Processing..." : "Generate Collage"}
            </button>
            <p className="text-xs text-gray-500 mt-1">&nbsp;</p>
          </div>
        </div>

        {!sufficientAlbums && (
          <div>
            <p className="text-sm text-red-600">
              This account does not have enough albums for your requested grid
              size
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600">
          A {gridSize} grid will be made using your top {finalCount} albums.
        </p>
      </form>

      {/* Loading Progress */}
      {loading && (
        <div className="text-center mb-8">
          <p className="mb-2">{status}</p>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">{progress}% complete</p>
        </div>
      )}

      {/* Default message */}
      {!loading && albums.length === 0 && (
        <p className="text-gray-500 text-center">
          Enter your Last.fm username and select your preferred dimensions to
          generate your album collage.
        </p>
      )}

      {/* Generated Collage */}
      {collage && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Your {gridSize} Color Sorted Collage
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
              download={`${user}-${width === "" ? 1 : Number(width)}x${
                height === "" ? 1 : Number(height)
              }-album-collage.jpg`}
              className="inline-block bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 transition"
            >
              Download Collage
            </a>
          </div>
        </div>
      )}
      <Analytics />
    </main>
  );
}
