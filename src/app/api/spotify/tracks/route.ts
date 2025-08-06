import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 50) // Spotify max is 50
    const timeRange = searchParams.get("time_range") || "medium_term"

    if (!authorization) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Invalid authorization header format" }, { status: 401 })
    }

    // Validate time_range
    const validTimeRanges = ['short_term', 'medium_term', 'long_term']
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json({ error: "Invalid time_range parameter" }, { status: 400 })
    }

    const response = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`, 
      {
        headers: {
          Authorization: authorization,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("Spotify tracks API error:", response.status, data)
      return NextResponse.json({ 
        error: data.error?.message || "Failed to fetch tracks",
        details: data,
        status: response.status
      }, { status: response.status })
    }

    // Transform Spotify tracks to match your album format
    const tracks = data.items.map((track: any) => ({
      name: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      album: track.album.name,
      coverUrl: track.album.images[0]?.url || "",
      external_urls: track.external_urls,
    }))

    return NextResponse.json({ tracks, total: data.total })
  } catch (error) {
    console.error("Tracks fetch error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}