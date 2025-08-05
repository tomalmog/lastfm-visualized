import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "50"
    const timeRange = searchParams.get("time_range") || "medium_term"

    if (!authorization) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`, {
      headers: {
        Authorization: authorization,
      },
    })

    if (response.ok) {
      const data = await response.json()

      // Transform Spotify tracks to match your album format
      const tracks = data.items.map((track: any) => ({
        name: track.name,
        artist: track.artists[0]?.name || "Unknown Artist",
        album: track.album.name,
        coverUrl: track.album.images[0]?.url || "",
        external_urls: track.external_urls,
      }))

      return NextResponse.json({ tracks })
    } else {
      return NextResponse.json({ error: "Failed to fetch tracks" }, { status: response.status })
    }
  } catch (error) {
    console.error("Tracks fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
