// src/app/api/lastfm/route.js
import axios from "axios";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");
  const limit = Math.min(parseInt(searchParams.get("limit")) || 100, 400); // Max 300, default 100

  if (!user) {
    return Response.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const res = await axios.get("https://ws.audioscrobbler.com/2.0/", {
      params: {
        method: "user.gettopalbums",
        user: user,
        api_key: process.env.LASTFM_API_KEY,
        format: "json",
        limit: limit,
      },
    });

    // Check for API error (e.g., invalid user)
    if (res.data.error) {
      return Response.json(
        { error: res.data.message || "Failed to fetch data from Last.fm" },
        { status: 500 }
      );
    }

    const albums = res.data.topalbums.album
  .map((album) => {
    // Get the largest available image size
    const images = album.image || [];
    let coverUrl = "";
    
    // Try to get images in order of preference: extralarge, large, medium, small
    for (const size of ["extralarge", "large", "medium", "small"]) {
      const image = images.find(img => img.size === size);
      if (image && image["#text"] && image["#text"].trim() !== "") {
        coverUrl = image["#text"];
        break;
      }
    }
    
    // If no sized images, try the medium size (index 2) as fallback
    if (!coverUrl && images[2] && images[2]["#text"] && images[2]["#text"].trim() !== "") {
      coverUrl = images[2]["#text"];
    }

    return {
      name: album.name,
      artist: album.artist.name || album.artist["#text"],
      coverUrl: coverUrl, // This might be empty string if no image available
    };
  })
  // Filter out albums without cover images
  .filter(album => album.coverUrl && album.coverUrl.trim() !== "");

console.log(`Filtered ${res.data.topalbums.album.length - albums.length} albums without cover images`);

    // Return albums + metadata
    return Response.json({
      albums,
      total: albums.length,
      user,
      limit,
    });
  } catch (error) {
    console.error("Last.fm API error:", error.message);
    return Response.json(
      { error: "Failed to fetch data from Last.fm" },
      { status: 500 }
    );
  }
}