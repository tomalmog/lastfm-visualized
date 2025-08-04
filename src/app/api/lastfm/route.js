// src/app/api/lastfm/route.js
import axios from "axios";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");
  const limit = Math.min(parseInt(searchParams.get("limit")) || 100, 400); // Max 400, default 100

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

    // Check for API error
    if (res.data.error) {
      return Response.json(
        { error: res.data.message || "Failed to fetch data from Last.fm" },
        { status: 500 }
      );
    }

    const albums = res.data.topalbums.album.map((album) => ({
      name: album.name,
      artist: album.artist.name || album.artist["#text"],
      coverUrl: album.image[2]["#text"], // Medium size
    }));

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