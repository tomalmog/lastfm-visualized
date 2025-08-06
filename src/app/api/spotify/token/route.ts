import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    console.log("Received code:", code ? "✓" : "✗")

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/spotify`

    console.log("Environment check:", {
      clientId: clientId ? "✓" : "✗",
      clientSecret: clientSecret ? "✓" : "✗",
      redirectUri,
    })

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Missing Spotify credentials" }, { status: 500 })
    }

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code", // Changed from "client_credentials"
        code,
        redirect_uri: redirectUri,
      }),
    })

    const data = await tokenResponse.json()
    console.log("Spotify API response:", tokenResponse.status, data)

    if (data.access_token) {
      return NextResponse.json(data)
    } else {
      console.error("Token exchange failed:", data)
      return NextResponse.json({ 
        error: data.error_description || data.error || "Failed to get access token",
        details: data 
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Token exchange error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}