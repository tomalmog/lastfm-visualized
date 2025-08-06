import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
	try {
		const authorization = request.headers.get("authorization")
		const { searchParams } = new URL(request.url)
		const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 100) // Enforce max 100
		const timeRange = searchParams.get("time_range") || "medium_term"

		if (!authorization) {
			return NextResponse.json({ error: "No authorization header" }, { status: 401 })
		}

		if (!authorization.startsWith("Bearer ")) {
			return NextResponse.json({ error: "Invalid authorization header format" }, { status: 401 })
		}

		const validTimeRanges = ["short_term", "medium_term", "long_term"]
		if (!validTimeRanges.includes(timeRange)) {
			return NextResponse.json({ error: "Invalid time_range parameter" }, { status: 400 })
		}

		const fetchTopTracks = async (offset: number) => {
			const res = await fetch(
				`https://api.spotify.com/v1/me/top/tracks?limit=50&offset=${offset}&time_range=${timeRange}`,
				{
					headers: {
						Authorization: authorization,
					},
				}
			)

			const json = await res.json()

			if (!res.ok) {
				throw { status: res.status, message: json.error?.message || "Spotify API error", details: json }
			}

			return json.items
		}

		// Always fetch at least 50
		const promises = [fetchTopTracks(0)]

		// If user wants more than 50, fetch the next 50
		if (limit > 50) {
			promises.push(fetchTopTracks(50))
		}

		const results = await Promise.all(promises)
		const allTracks = results.flat().slice(0, limit) // Slice in case user wants <100

		const tracks = allTracks.map((track: any) => ({
			name: track.name,
			artist: track.artists[0]?.name || "Unknown Artist",
			album: track.album.name,
			coverUrl: track.album.images[0]?.url || "",
			external_urls: track.external_urls,
		}))

		return NextResponse.json({ tracks, total: tracks.length })
	} catch (error: any) {
		console.error("Tracks fetch error:", error)
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error?.message || "Unknown error",
				details: error?.details || null,
			},
			{ status: error?.status || 500 }
		)
	}
}
